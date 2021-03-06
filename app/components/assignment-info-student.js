Encompass.AssignmentInfoStudentComponent = Ember.Component.extend(Encompass.CurrentUserMixin, Encompass.ErrorHandlingMixin, {
  formattedDueDate: null,
  formattedAssignedDate: null,
  isResponding: false,
  displayedAnswer: null,
  loadAnswerErrors: [],
  elementId: 'assignment-info-student',

  init() {
    this._super(...arguments);
  },

  didReceiveAttrs() {
    if (this.get('assignment')) {
      if (this.get('displayedAnswer')) {
          this.set('displayedAnswer', null);
      }

      this.toggleResponse();
      let dateTime = 'YYYY-MM-DD';
      let dueDate = this.assignment.get('dueDate');
      let assignedDate = this.assignment.get('assignedDate');
      this.set('formattedDueDate', moment(dueDate).format(dateTime));
      this.set('formattedAssignedDate', moment(assignedDate).format(dateTime));
    }

    this._super(...arguments);
  },

  sortedList: function() {
    if (!this.get('answerList')) {
      return [];
    }
    return this.get('answerList').sortBy('createDate').reverse();
  }.property('answerList.[]'),

  priorAnswer: function() {
    return this.get('sortedList').get('firstObject');
  }.property('sortedList.[]'),

  toggleResponse: function() {
    if (this.get('isResponding')) {
      this.set('isResponding', false);
    } else if (this.get('isRevising')) {
      this.set('isRevising', false);
    }
  },

  actions: {
    beginAssignmentResponse: function() {
      this.set('isResponding', true);
      if (this.get('answerCreated')) {
        this.set('answerCreated', false);
      }
      Ember.run.later(() => {
        $('html, body').animate({scrollTop: $(document).height()});
      }, 100);
    },

    reviseAssignmentResponse: function() {
      this.set('isRevising', true);
      if (this.get('answerCreated')) {
        this.set('answerCreated', false);
      }
      Ember.run.later(() => {
        $('html, body').animate({scrollTop: $(document).height()});
      }, 100);
    },

    toAnswerInfo: function(answer) {
      this.sendAction('toAnswerInfo', answer);
    },

    displayAnswer: function(answer) {
      if (this.get('answerCreated')) {
        this.set('answerCreated', false);
      }
      this.set('displayedAnswer', answer);
      Ember.run.later(() => {
        $('html, body').animate({scrollTop: $(document).height()});
      }, 100);
    },

    handleCreatedAnswer: function(answer) {
      this.set('answerCreated', true);
      this.toggleResponse();
      this.get('answerList').addObject(answer);
    },

    cancelResponse: function() {
      this.toggleResponse();

    },
  }

});
