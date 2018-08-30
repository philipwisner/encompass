/**
  * # Wokspace List Controller
  * @description The controller for listing workspaces
  * @author Amir Tahvildaran <amir@mathforum.org>
  * @since 1.0.0
*/
Encompass.WorkspacesListController = Ember.Controller.extend(Encompass.CurrentUserMixin, {
  sortProperties: ['name'],
  workspaceToDelete: null,

  currentAsOf: function() {
    return moment(this.get('since')).format('H:mm');
  }.property(),

  listFilter: 'all',

  setDisplayList: function() {
    console.log('running l');
    const key = {
      all: 'allWorkspaces',
      mine: 'ownWorkspaces',
      public: 'publicWorkspaces'
    };

    const filter = this.get('listFilter');

    if (Ember.isEmpty(filter) || Ember.isEmpty(key[filter])) {
      return this.get('model').rejectBy('isTrashed');
    }

    const listName = key[filter];
    this.set('displayList', this.get(listName));
  }.observes('listFilter', 'model.@each.isTrashed'),

  setOwnWorkspaces: function() {
    const currentUser = this.get('currentUser');
    const workspaces = this.get('model').rejectBy('isTrashed');

    this.set('ownWorkspaces', workspaces.filterBy('owner.id', currentUser.id));
  }.observes('model.@each.isTrashed'),

  setAllWorkspaces: function() {
    this.set('allWorkspaces', this.get('model').rejectBy('isTrashed'));
  }.observes('model.@each.isTrashed'),

  test: function() {
    console.log('something was trashed');

  }.observes('model.@each.isTrashed'),

  setPublicWorkspaces: function() {
    console.log('public');
    const workspaces = this.get('model').rejectBy('isTrashed');
    this.set('publicWorkspaces', workspaces.filterBy('mode', 'public'));
  }.observes('model.@each.isTrashed'),

  actions: {
    showModal: function(ws) {
      this.set('workspaceToDelete', ws);
    },
    trashWorkspace: function(ws) {
      const id = ws.id;
      const workspaces = this.get('model');
      const filtered = workspaces.filterBy('id', id);
      console.log('filtered', filtered);
      if (!Ember.isEmpty(filtered)) {
        const ws = filtered.objectAt(0);
        console.log('ws to trash', ws);
        ws.set('isTrashed', true);
        ws.save().then((rec) => {
          console.log('rec', rec);
          this.set('workspaceToDelete', null);
        });
      }
    },

    toggleFilter: function(key) {
      if (key === this.get('listFilter')) {
        return;
      }
      this.set('listFilter', key);
    }
  }
});


