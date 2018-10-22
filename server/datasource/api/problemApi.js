/* eslint complexity: 0 */
/**
  * # Problem API
  * @description This is the API for problem based requests
*/
/* jshint ignore:start */
//REQUIRE MODULES
const logger = require('log4js').getLogger('server');
const _ = require('underscore');

//REQUIRE FILES
const models = require('../schemas');
const userAuth = require('../../middleware/userAuth');
const utils    = require('../../middleware/requestHandler');
const access   = require('../../middleware/access/problems');
const accessUtils = require('../../middleware/access/utils');

module.exports.get = {};
module.exports.post = {};
module.exports.put = {};
// eslint-disable-next-line no-unused-vars
async function getOrgRecommendedProblems(user, orgIds, isIdOnly=true) {
  try {
    let orgs = await models.Organization.find({_id: {$in: orgIds}}).lean().exec();
    if (!orgs) {
      return [];
    }
    let problems = _.map(orgs, org => org.recommendedProblems);
    problems = _.without(problems, undefined, null);
    if (isIdOnly) {
      return problems;
    }

    return problems;
  } catch(err) {
    console.error(`Error getOrgRecommendedProblems: `, err);
  }
}

async function getPowsProblems(criteria, isIdOnly) {
  try {
    let problems;
    if (isIdOnly) {
      problems = await models.Problem.find(criteria, {_id: 1}).lean().exec();
      return _.map(problems, p => p._id);
    }
    return await models.Problem.find(criteria).lean().exec();

  }catch(err) {
    console.error(`Error getPowsProblems: ${err}`);
  }
}

async function buildPowsFilterBy(pows) {
  let filter = {};
  let powIds;

  if (pows === 'none') {
    criteria = {
      puzzleId: null,
      isTrashed: false
    };
  } else if (pows === "privateOnly") {
     // exclude public pows
          criteria = {
            $and: [
              { puzzleId: { $exists: true, $ne: null } },
              { privacySetting: 'M'},
              {isTrashed: false}
            ]
          };

    } else if (pows === 'publicOnly') {
      criteria = {
        $and: [
          { puzzleId: { $exists: true, $ne: null } },
          { privacySetting: 'E'},
          {isTrashed: false}
        ]
      };

    }
    powIds = await getPowsProblems(criteria, true);

    if (!_.isEmpty(powIds)) {

      filter._id = { $in: powIds };
    }
    console.log('filter', filter);
    return filter;
}

/**
  * @public
  * @method getProblems
  * @description __URL__: /api/problems
  * @returns {Object} An array of problem objects
  * @throws {NotAuthorizedError} User has inadequate permissions
  * @throws {InternalError} Data retrieval failed
  * @throws {RestError} Something? went wrong
  */

// query params support:
// ids
// filterBy
// sortBy

const getProblems = async function(req, res, next) {
  try {
    const user = userAuth.requireUser(req);
    if (!user) {
      return utils.sendError.InvalidCredentialsError(null, res);
    }
    let { ids, filterBy, sortBy, searchBy, page, } = req.query;

    let filter = {};

    if (filterBy) {
      console.log('filterBy problem API:', JSON.stringify(filterBy));
      let { pows, all } = filterBy;

      if (pows) {
        filter = await buildPowsFilterBy(pows);
      } else if (all) {
        let { org } = all;
        if (org) {
          let { recommended, organizations } = org;

          let recommendedProblems;
          if (recommended) {
            recommendedProblems = await getOrgRecommendedProblems(user, recommended , true);
            console.log('recommendedProblems', recommendedProblems);
          }

          if (!_.isEmpty(recommendedProblems)) {
            if (!filter.$or) {
              filter.$or = [];
            }
            filter.$or.push({_id: {$in: recommendedProblems}});

         }
         if (organizations) {
          if (!filter.$or) {
            filter.$or = [];
          }
           filter.$or.push({organization: {$in: organizations}});
         }

         if (_.isEmpty(recommendedProblems) && !organizations) {
          console.log('empty and recommended only');
          // recommended only but no recommendations; return immediately
           const data = {
            'problems': [],
            'meta': {
              'total': 0,
              pageCount: 1,
              currentPage: 1
            }
        };
          return utils.sendResponse(res, data);
         }

        }
      } else {
        filter = filterBy;
      }
    }
    let searchFilter;

    if (searchBy) {
      let { query, criterion } = searchBy;
    if (criterion) {
      if (criterion === 'category') {
        let matches = await accessUtils.getProblemsByCategory(query);
        searchFilter = { _id: { $in: matches } };
      } else {
        query = query.replace(/\s+/g, "");
        let regex = new RegExp(query.split('').join('\\s*'), 'i');

        searchFilter = {[criterion]: regex};
      }
    }
    }

    let sortParam = {title: 1};
    let doCollate = true;

    if (sortBy) {
      sortParam = sortBy.sortParam;
      doCollate = sortBy.doCollate;
    }
    const criteria = await access.get.problems(user, ids, filter, searchFilter);
    let results, itemCount;

    if (doCollate) {
       [ results, itemCount ] = await Promise.all([
        models.Problem.find(criteria).collation({locale: 'en', strength: 1}).sort(sortParam).limit(req.query.limit).skip(req.skip).lean().exec(),
        models.Problem.count(criteria)
      ]);
    } else {
      [ results, itemCount ] = await Promise.all([
        models.Problem.find(criteria).sort(sortParam).limit(req.query.limit).skip(req.skip).lean().exec(),
        models.Problem.count(criteria)
      ]);
    }

    const pageCount = Math.ceil(itemCount / req.query.limit);

    let currentPage = page;
    if (!currentPage) {
      currentPage = 1;
    }
    const data = {
      'problems': results,
      'meta': {
        'total': itemCount,
        pageCount,
        currentPage
      }
  };
    utils.sendResponse(res, data);
    next();
  }catch(err) {
    console.error(`Error getProblems: ${err}`);
    console.trace();
    return utils.sendError.InternalError(err, res);
  }


  // add permissions here

};

/**
  * @public
  * @method getProblem
  * @description __URL__: /api/problem/:id
  * @returns {Object} An problem object
  * @throws {NotAuthorizedError} User has inadequate permissions
  * @throws {InternalError} Data retrieval failed
  * @throws {RestError} Something? went wrong
  */

const getProblem = async function(req, res, next) {
  const user = userAuth.requireUser(req);

  if (!user) {
    return utils.sendError.InvalidCredentialsError('You must be logged in.', res);
  }

  let id = req.params.id;

  let problem = await models.Problem.findById(id);

  // record not found in db or is trashed
  if (!problem || problem.isTrashed) {
    return utils.sendResponse(res, null);
  }

  let canLoadProblem = await access.get.problem(user, id);

  // user does not have permission to access problem
  if (!canLoadProblem) {
    return utils.sendError.NotAuthorizedError('You do not have permission.', res);
  }
  // user has permission; send back record
  const data = {
    problem
  };

  return utils.sendResponse(res, data);
};

/**
  * @public
  * @method postProblem
  * @description __URL__: /api/problems
  * @throws {NotAuthorizedError} User has inadequate permissions
  * @throws {InternalError} Data saving failed
  * @throws {RestError} Something? went wrong
  */

const postProblem = async function(req, res, next) {
  const user = userAuth.requireUser(req);

  if (!user) {
    return utils.sendError.InvalidCredentialsError('No user logged in!', res);
  }

  // Add permission checks here
  const problem = new models.Problem(req.body.problem);
  if (req.body.problem.privacySetting === "E") {
    let title = req.body.problem.title;
    title = title.replace(/\s+/g, "");
    let split = title.split('').join('\\s*');
    let full = `^${split}\\Z`;
    let regex = new RegExp(full, 'i');
    const exists = await models.Problem.find({ title: {$regex: regex }, isTrashed: false }).lean().exec();

    if (exists.length >= 1) {
      return utils.sendError.ValidationError('There is already an existing public problem with that title.', 'title', res);
    }
  }
  problem.createdBy = user;
  problem.createDate = Date.now();
  problem.save((err, doc) => {
    if (err) {
      console.error(`Error post problem: ${err}`);
      console.trace();
      return utils.sendError.InternalError(err, res);
    }
    const data = {'problem': doc};
    utils.sendResponse(res, data);
    next();
  });
};


/**
  * @public
  * @method putProblem
  * @description __URL__: /api/problems/:id
  * @description cannot make changes to the categories with putProblem
  *              use addCategory or removeCategory
  * @throws {NotAuthorizedError} User has inadequate permissions
  * @throws {InternalError} Data update failed
  * @throws {RestError} Something? went wrong
  */

const putProblem = async function(req, res, next){
  try {
    const user = userAuth.requireUser(req);

    if (!user) {
      return utils.sendError.InvalidCredentialsError('No user logged in!', res);
    }

    if (req.body.problem.privacySetting === "E") {
      let title = req.body.problem.title;
      let split = title.split('').join('\\s*');
      let full = `^${split}\\Z`;
      let regex = new RegExp(full, 'i');
      const exists = await models.Problem.find({ title: {$regex: regex }, _id: {$ne: req.params.id}, isTrashed: false }).lean().exec();
      if (exists.length >= 1) {
        return utils.sendError.ValidationError('There is already an existing public problem with that title.', 'title', res);
      }
    }

    models.Problem.findById(req.params.id, (err, doc) => {
      if(err) {
        logger.error(err);
        return utils.sendError.InternalError(err, res);
      }
      // make the updates, but don't update categories or _id
      for(let field in req.body.problem) {
        if((field !== '_id') && (field !== undefined)) {
          doc[field] = req.body.problem[field];
        }
      }
      doc.save((err, problem) => {
        if (err) {
          logger.error(err);
          return utils.sendError.InternalError(err, res);
        }
        const data = {'problem': problem};
        utils.sendResponse(res, data);
      });
    });
  }catch(err) {
    console.error(`Error putProblem: ${err}`);
    console.trace();
    return utils.sendError.InternalError(err, res);
  }
};

/**
  * @public
  * @method addCategory
  * @description __URL__: /api/problems/addCategory/:id
  * @body {categoryId: ObjectId}
  * @throws {NotAuthorizedError} User has inadequate permissions
  * @throws {InternalError} Data update failed
  * @throws {RestError} Something? went wrong
  */

const addCategory = (req, res, next) => {
  const user = userAuth.requireUser(req);

  if (!user) {
    return utils.sendError.InvalidCredentialsError('No user logged in!', res);
  }

  models.Problem.findById(req.params.id, (err, doc) => {
    if(err) {
      logger.error(err);
      return utils.sendError.InternalError(err, res);
    }
    // only add a category if it's new
    if (doc.categories.indexOf(req.body.categoryId) === -1){
      // doing a simple arr.push(id) was throwing an error because it was
      // invoking mongoose's deprectated $pushAll method. Using the
      // concat() method below uses $set and thus works.
      doc.categories = doc.categories.concat([req.body.categoryId]);
    }
    doc.save((err, problem) => {
      if (err) {
        logger.error(err);
        return utils.sendError.InternalError(err, res);
      }
      const data = {'problem': problem};
      utils.sendResponse(res, data);
    });
  });
};

/**
  * @public
  * @method removeCategory
  * @description __URL__: /api/problems/removeCategory/:id
  * @body {categoryId: ObjectId}
  * @throws {NotAuthorizedError} User has inadequate permissions
  * @throws {InternalError} Data update failed
  * @throws {RestError} Something? went wrong
  */

const removeCategory = (req, res, next) => {
  const user = userAuth.requireUser(req);

  if (!user) {
    return utils.sendError.InvalidCredentialsError('No user logged in!', res);
  }

  models.Problem.findById(req.params.id, (err, doc) => {
    if (err) {
      logger.error(err);
      return utils.sendError.InternalError(err, res);
    }
    // only attempt to remove if the category exists
    if (doc.categories.indexOf(req.body.categoryId) !== -1) {
      // remove category using the category Id
      doc.categories.splice(doc.categories.indexOf(req.body.categoryId), 1);
    }
    doc.save((err, problem) => {
      if (err) {
        logger.error(err);
        return utils.sendError.InternalError(err, res);
      }
      const data = {'problem': problem};
      utils.sendResponse(res, data);
    });
  });
};

module.exports.get.problems = getProblems;
module.exports.get.problem = getProblem;
module.exports.post.problem = postProblem;
module.exports.put.problem = putProblem;
module.exports.put.problem.addCategory = addCategory;
module.exports.put.problem.removeCategory = removeCategory;
/* jshint ignore:end */