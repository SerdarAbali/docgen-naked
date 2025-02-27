module.exports = function(context, options) {
  return {
    name: 'docusaurus-edit-route',
    async contentLoaded({content, actions}) {
      const {addRoute} = actions;
      addRoute({
        path: '/edit/:id',
        component: '@site/src/pages/edit/[id].tsx',
        exact: true,
      });
    },
  };
};