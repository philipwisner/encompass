Encompass.WorkspaceCommentComponent = Ember.Component.extend(Encompass.CurrentUserMixin, {
  tagName: 'li',
  currentWorkspace: null,
  classNameBindings: ['comment.label', 'relevanceClass', 'comment.inReuse' ],
  permissions: Ember.inject.service('workspace-permissions'),

  isForCurrentWorkspace: function() {
    return Ember.isEqual(this.get('currentWorkspace.id'), this.comment.get('workspace.id'));
  }.property('currentWorkspace.id', 'comment.workspace.id'),

  canDelete: function () {
    let ws = this.get('currentWorkspace');
    const currentUserId = this.get('currentUser.id');
    const creatorId = this.get('comment.createdBy.id');
    return currentUserId === creatorId || this.get('permissions').canEdit(ws, 'comments', 4);
  }.property('currentWorkspace.id', 'comment.workspace.id'),

  permittedToComment: function () {
    let ws = this.get('currentWorkspace');
    return this.get('permissions').canEdit(ws, 'comments', 2);
  }.property('currentWorkspace.id', 'comment.workspace.id'),

  relevanceClass: function(){
    return 'relevance-' + this.get('comment.relevance');
  }.property('comment.relevance'),

  actions: {
    deleteComment: function( comment ){
      this.sendAction('action', comment);
    }
  }
});

