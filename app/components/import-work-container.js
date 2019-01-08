Encompass.ImportWorkContainerComponent = Ember.Component.extend(Encompass.CurrentUserMixin, Encompass.ErrorHandlingMixin, Encompass.AddableProblemsMixin, {
    elementId: "import-work-container",
    selectedProblem: null,
    selectedSection: null,
    selectedFiles: null,
    sections: null,
    uploadedFiles: null,
    answers: null,
    uploadedAnswers: null,
    uploadedSubmissions: null,
    createdWorkspace: null,
    workspaceName: null,
    workspaceOwner: null,
    workspaceMode: null,
    folderSet: null,
    assignmentName: null,
    alert: Ember.inject.service("sweet-alert"),
    utils: Ember.inject.service('utility-methods'),
    selectedFolderSet: null,
    findRecordErrors: [],
    createAnswerErrors: [],
    postErrors: [],
    currentStep: { value: 1 },
    showSelectProblem: Ember.computed.equal("currentStep.value", 1),
    showSelectClass: Ember.computed.equal("currentStep.value", 2),
    showUploadFiles: Ember.computed.equal("currentStep.value", 3),
    showMatchStudents: Ember.computed.equal("currentStep.value", 4),
    showCreateWs: Ember.computed.equal("currentStep.value", 5),
    showReview: Ember.computed.equal("currentStep.value", 6),
    steps: [
      { value: 0 },
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: 5 },
      { value: 6 }
    ],
    detailsItems: function() {
      return [
        {
          label: "Selected Problem",
          displayValue: this.get("selectedProblem.title"),
          emptyValue: "No Problem",
          propName: "selectedProblem",
          associatedStep: 1
        },
        {
          label: "Selected Class",
          displayValue: this.get("selectedSection.name"),
          emptyValue: "No Class",
          propName: "selectedSection",
          associatedStep: 2
        },
        {
          label: "Uploaded Files",
          displayValue: this.get("uploadedFiles.length"),
          propName: "uploadedFileCount",
          associatedStep: 3
        },
        {
          label: "Created Workspace",
          displayValue: this.get("workspaceName"),
          emptyValue: "No Workspace",
          propName: "workspaceName",
          associatedStep: 5
        },
        {
          label: "Created Assignment",
          displayValue: this.get("assignmentName"),
          emptyValue: "No Assignment",
          propName: "assignmentName",
          associatedStep: 5
        }
      ];
    }.property(
      "selectedProblem",
      "selectedSection",
      "uploadedFiles",
      "workspaceName",
      "assignmentName"
    ),

    setIsCompDirty: function() {
      const problem = this.get("selectedProblem");
      const section = this.get("selectedSection");
      const files = this.get("uploadedFiles");

      const ret =
        !Ember.isEmpty(problem) ||
        !Ember.isEmpty(section) ||
        !Ember.isEmpty(files);

      if (ret) {
        this.set("isCompDirty", true);
        this.sendAction("doConfirmLeaving", true);
        return;
      }
      this.set("isCompDirty", false);
      this.sendAction("doConfirmLeaving", false);
    }.observes(
      "selectedProblem",
      "selectedSection",
      "uploadedFiles",
      "isUploadingAnswer"
    ),

    init: function() {
      this._super(...arguments);
      this.set("sections", this.model.sections);
    },

    resetImportDetails: function() {
      const opts = ["selectedProblem", "selectedSection", "uploadedFiles"];

      for (let opt of opts) {
        if (!Ember.isEmpty(this.get(opt))) {
          this.set(opt, null);
        }
      }
    },

    willDestroyElement: function() {
      this.resetImportDetails();
    },

    handleAdditionalFiles: function() {
      const additionalFiles = this.get("additionalFiles");
      if (Ember.isEmpty(additionalFiles) || !Array.isArray(additionalFiles)) {
        return;
      }

      let uploadedFiles = this.get("uploadedFiles");

      if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
        uploadedFiles = [];
      }

      let combinedFiles = uploadedFiles.concat(additionalFiles);
      this.set("uploadedFiles", combinedFiles);
      this.set("additionalFiles", null);
      this.set("isAddingMoreFiles", false);
    }.observes("additionalFiles.[]"),

    getSectionStudents(section) {
      if (!section) {
        return Promise.resolve(this.get("store").findAll("user"));
      }
      return Promise.resolve(section.get("students"));
    },
    maxSteps: function () {
      return this.get('steps.length') - 1;
    }.property('steps'),

    actions: {
      goToStep(stepValue) {
        if (!stepValue) {
          return;
        }
        this.set("currentStep", this.get("steps")[stepValue]);
      },

      changeStep(direction) {
        let currentStep = this.get("currentStep.value");
        let maxStep = this.get("maxSteps");
        if (direction === 1) {
          if (currentStep === maxStep) {
            return;
          }
          return;
        }
        if (direction === -1) {
          if (currentStep === 1) {
            return;
          }
          this.set("currentStep", this.get("steps")[currentStep - 1]);
        }
      },

      setSelectedProblem() {
        this.set("selectedProblem", this.get("selectedProblem"));
        this.set("currentStep", this.get("steps")[2]);
      },

      setSelectedSection() {
        let section = this.get("selectedSection");

        // get section info needed for matching
        this.set("isFetchingSectionStudents", true);
        Promise.resolve(this.getSectionStudents(section)).then(students => {
          this.set("isFetchingSectionStudents", false);

          let asArray = students.toArray();
          let hash = {};
          asArray.forEach(user => {
            hash[user.get("id")] = user;
          });
          this.set("studentMap", hash);
          this.set("currentStep", this.get("steps")[3]);
        });
      },

      setUploadedFiles() {
        this.set("uploadedFiles", this.get("uploadedFiles"));
        this.send("loadStudentMatching");
      },

      setMatchedStudents() {
        this.set("currentStep", this.get("steps")[5]);
      },

      prepareReview() {
        this.set("currentStep", this.get("steps")[6]);
      },

      editImportDetail: function(detailName) {
        if (!detailName || typeof detailName !== "string") {
          return;
        }
        if (detailName === "additionalFiles") {
          this.set("isAddingMoreFiles", true);
          this.set("selectedFiles", null);
          return;
        }
        if (detailName === "uploadedFiles") {
          let uploadedFiles = this.get("uploadedFiles");
          uploadedFiles.forEach(image => {
            this.get("store")
              .findRecord("image", image._id)
              .then(image => {
                image.destroyRecord();
              });
          });
          this.set("selectedFiles", null);
        }
        this.set(detailName, null);
      },

      loadStudentMatching: function() {
        let images = this.get("uploadedFiles");
        let answers = [];

        return Promise.all(
          images.map(image => {
            let ans = {};
            let imageId = image._id;
            // TODO: Determine how to handle groups
            this.store
              .findRecord("image", imageId)
              .then(image => {
                ans.explanationImage = image;
                ans.problem = this.get("selectedProblem");
                ans.section = this.get("selectedSection");
                ans.isSubmitted = true;
                answers.push(ans);
                this.set("answers", answers);
              })
              .catch(err => {
                console.log("error is", err);
              });
          })
        ).then(() => {
          this.set("currentStep", this.get("steps")[4]);
        });
      },

      reviewSubmissions: function() {
        this.set("isMatchingStudents", false);
        this.set("isReviewingSubmissions", true);
      },

      uploadAnswers: function() {
        let that = this;
        this.set("isUploadingAnswer", true);
        let answers = this.get("answers");
        let subs;
        let assignment;
        if (this.get('createdAssignment')) {
          assignment = this.get('createdAssignment');
        } else {
          assignment = null;
        }
        return Promise.all(
          answers.map(answer => {
            // TODO: Determine how to handle groups
            if (this.get('utils').isNonEmptyArray(answer.students)) {
              answer.createdBy = answer.students[0];
            } else {
              answer.createdBy = this.get('currentUser');
            }
            answer.answer = "See image";

            let ans = that.store.createRecord("answer", answer);
            ans.set("section", that.get("selectedSection"));
            ans.set("problem", that.get("selectedProblem"));
            ans.set('assignment', assignment);
            return ans.save();
          })
        )
        .then(res => {
          this.set("isUploadingAnswer", false);
          this.get("alert").showToast("success", `${res.length} Submissions Created`, "bottom-end", 5000, false, null);
          // if doCreateWorkspace, convert to submissions and create workspace
          // else just display details about # of answers uploaded
          const uploadedAnswers = res;

          if (that.get("workspaceName")) {
            this.set("isCreatingWorkspace", true);

            this.set("isCompDirty", false);
            this.sendAction("doConfirmLeaving", false);
            subs = res.map(ans => {
              //const teachers = {};
              const clazz = {};
              const publication = {
                publicationId: null,
                puzzle: {}
              };
              const creator = {};
              const teacher = {};

              const student = ans.get("createdBy");
              const section = ans.get("section");
              const problem = ans.get("problem");

              publication.puzzle.title = problem.get("title");
              publication.puzzle.problemId = problem.get("problemId");

              creator.studentId = student.get("userId");
              creator.username = student.get("username");

              clazz.sectionId = section.get("sectionId");
              clazz.name = section.get("name");

              const teachers = section.get("teachers");
              const primaryTeacher = teachers.get("firstObject");

              teacher.id = primaryTeacher.get("userId");
              let sub = {
                // longAnswer: ans.get('explanation'),
                answer: ans.id,
                clazz: clazz,
                creator: creator,
                teacher: teacher,
                publication: publication
              };
              return sub;
            });
            let folderSetId;
            let folderSet = this.get("folderSet");
            if (folderSet) {
              folderSetId = folderSet.get("id");
            } else {
              folderSetId = "";
            }


            let postData = {
              subs: JSON.stringify(subs),
              doCreateWorkspace: true,
              workspaceOwner: JSON.stringify(this.get('workspaceOwner.id')),
              requestedName: JSON.stringify(this.get("workspaceName")),
              workspaceMode: JSON.stringify(this.get('workspaceMode')),
              folderSet: JSON.stringify(folderSetId),
            };
            Ember.$.post({
              url: "api/import",
              data: postData
            })
              .then(res => {
                that.set("isCreatingWorkspace", false);
                if (res.workspaceId) {
                  that.set("createdWorkspace", res);
                  that.sendAction("toWorkspaces", res);
                  this.get("alert").showToast(
                    "success",
                    "Workspace Created",
                    "bottom-end",
                    4000,
                    false,
                    null
                  );
                }
              })
              .catch(err => {
                this.handleErrors(err, "postErrors");
              });
          } else {
            // don't create workspace
            that.set("isReviewingSubmissions", false);
            that.set("uploadedAnswers", uploadedAnswers);
          }
        })
        .catch(err => {
          this.handleErrors(err, "createAnswerErrors");
        });
      },

      createAssignment: function () {
        const that = this;
        if (that.get('assignmentName')) {
          this.set('savingAssignment', true);
          let section = this.get('selectedSection');
          let problem = this.get('selectedProblem');
          let name = this.get('assignmentName');
          let createdBy = this.get('currentUser');
          let assignedDate = new Date();
          let dueDate = new Date();

          const students = section.get('students');

          const createAssignmentData = that.store.createRecord('assignment', {
            createdBy: createdBy,
            createDate: new Date(),
            section: section,
            problem: problem,
            assignedDate: assignedDate,
            dueDate: dueDate,
            name: name,
          });

          students.forEach((student) => {
            createAssignmentData.get('students').pushObject(student);
          });

          createAssignmentData.save()
            .then((assignment) => {
              this.set('savingAssignment', false);
              this.set('createdAssignment', assignment);
              this.get('alert').showToast('success', 'Assignment Created', 'bottom-end', 3000, false, null);
              this.send('uploadAnswers');
            })
            .catch((err) => {
              that.handleErrors(err, 'createRecordErrors', createAssignmentData);
            });
        }
      },

      importWork: function () {
        if (this.get('assignmentName')) {
          this.send('createAssignment');
        } else {
          this.send('uploadAnswers');
        }
      },

      toggleMenu: function() {
        $("#filter-list-side").toggleClass("collapse");
        $("#arrow-icon").toggleClass("fa-rotate-180");
        $("#filter-list-side").addClass("animated slideInLeft");
      }
    }
  }
);