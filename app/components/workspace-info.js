Encompass.WorkspaceInfoComponent = Ember.Component.extend(Encompass.CurrentUserMixin, {
  elementId: 'workspace-info',
  comments: Ember.inject.controller,
  isEditing: false,
  selectedMode: null,
  searchText: "",


  searchResults: function () {
    var searchText = this.get('searchText');
    searchText = searchText.replace(/\W+/g, "");
    if (searchText.length < 2) {
      return;
    }

    var people = this.store.find('user', {
      name: searchText
    });
    return people;
  }.property('searchText'),

  canEdit: function () {
    console.log('current model', this.get('workspace'));
    var canEdit = Permissions.userCanModifyWorkspace(this.get('currentUser'), this.get('workspace'));
    return canEdit;
  }.property('workspace.owner'),


  modes: function () {
    return Permissions.modeValues();
  }.property(),

  actions: {
    removeEditor: function (editor) {
        var workspace = this.get('workspace');
        workspace.get('editors').removeObject(editor);
    },

    addEditor: function (editor) {
      var workspace = this.get('workspace');
      if (!workspace.get('editors').contains(editor)) {
        workspace.get('editors').pushObject(editor);
      }
    },

    editWorkspace: function () {
      this.set('isEditing', true);
      let workspace = this.get('workspace');
      this.set('selectedMode', workspace.get('mode'));
    },

    saveWorkspace: function () {
      // this.actions.changeMode.call(this);
      var mode = this.get('selectedMode');
      console.log('selected mode is', mode);
      var workspace = this.get('workspace');
      workspace.set('mode', mode);
      workspace.save();
      this.set('isEditing', false);
    }
  }

});



