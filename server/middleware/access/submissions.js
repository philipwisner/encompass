const utils = require('./utils');
const apiUtils = require('../../datasource/api/utils');

module.exports.get = {};

const accessibleSubmissionsQuery = async function(user, ids) {
  try {
    if (!apiUtils.isNonEmptyObject(user)) {
      return {};
    }

    const { accountType, actingRole } = user;

    const isStudent = accountType === 'S' || actingRole === 'student';

    let filter = {
      $and: [
        { isTrashed: { $ne: true } }
      ]
    };


      if (apiUtils.isNonEmptyArray(ids)) {
        filter.$and.push({ _id: { $in : ids } });
      } else if(apiUtils.isValidMongoId(ids)) {
        filter.$and.push({ _id: ids });
      }

      if (accountType === 'A' && !isStudent) {
        return filter;
      }

    const accessibleWorkspaceIds = await utils.getAccessibleWorkspaceIds(user);

    // everyone should have access to all submissions that belong to a workspace that they have access to
    const orFilter = { $or: [] };
    orFilter.$or.push({ createdBy: user._id });
    orFilter.$or.push({workspaces : { $elemMatch: { $in: accessibleWorkspaceIds} }});

    const restrictedRecords = await utils.getRestrictedWorkspaceData(user, 'submissions');
    console.log('restrictedSubmissionIds', restrictedRecords);

    if (apiUtils.isNonEmptyArray(restrictedRecords)) {
      filter.$and.push({ _id: { $nin: restrictedRecords } });
    }

    if (isStudent) {
      filter.$and.push(orFilter);
      return filter;
    }

    // will only reach here if admins/pdadmins are in actingRole teacher
    //should have access to all submissions that you created
    // in case they are not in a workspace

    if (accountType === 'P') {
      // PDamins can get any submissions created by someone from their organization
      const userOrg = user.organization;

      const userIds = await utils.getModelIds('User', {organization: userOrg});
      userIds.push(user._id);

      orFilter.$or.push({createdBy : {$in : userIds}});
      filter.$and.push(orFilter);
      return filter;
    }

    if (accountType === 'T') {
    // teachers can get any submissions where they are the primary teacher or in the teachers array?
    // should teachers be able to get all submissions from organization?


      // filter.$or.push({ 'teacher.id': user.id });
      // filter.$or.push({ teachers : user.id });
      filter.$and.push(orFilter);
      return filter;
    }

  }catch(err) {
    console.log('err asq', err);
  }
};

const canLoadSubmission = async function(user, id) {
  if (!user) {
    return;
  }

  const { accountType, actingRole } = user;
  const isStudent = accountType === 'S' || actingRole === 'student';

  if (accountType === 'A' && !isStudent) {
    return true; // admins currently can get all submissions
  }

  // use accessibleSubmissions criteria to determine access for teachers/pdAdmins

  let criteria = await accessibleSubmissionsQuery(user, id);

  let accessibleIds = await utils.getModelIds('Submission', criteria);
  accessibleIds = accessibleIds.map(id => id.toString()); // map objectIds to strings to check for existence

  return accessibleIds.includes(id);
  };

module.exports.get.submissions = accessibleSubmissionsQuery;
module.exports.get.submission = canLoadSubmission;