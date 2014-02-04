CRUD links and inline editing
=============================

## Generating links
In order to add create, update and delete links to the datagrid, first you need to tell the datagrid what routes
to use to generate the links:

``` html
<datagrid
    [...]
    routes="create: 'entity_create', edit: 'entity_update', delete: 'entity_delete'"
></datagrid>
```

Note that these routes need to be exposed in the [FOSJSRoutingBundle](https://github.com/FriendsOfSymfony/FOSJsRoutingBundle).

You can now use some of the directive's methods to generate the relevant URL's:

``` html
<script type="text/ng-template" id="header-template">
    <tr>
        <th>ID</th>
        [...]
        <th><a ng-href="{{ createPath() }}">New entity</a></th>
    </tr>
</script>

<script type="text/ng-template" id="body-template">
    <tr>
        {% verbatim %}
        <td>{{ row.id }}</th>
        [...]
        <td>
            <a ng-href="{{ editPath(row) }}">Edit entity</a>
            <a ng-href="{{ deletePath(row) }}">Delete entity</a>
        </td>
        {% endverbatim %}
    </tr>
</script>
```

By default, datagrid will map the id property of your row to the {id} placeholder of your route. This is not always
the desired behaviour. To change the mapping, add the following to your element:

``` html
<datagrid
    [...]
    routes="create: 'entity_create', edit: 'entity_update', delete: 'entity_delete'"
    id-map="{ entity: 'row.id', slug: 'row.slug' }"
></datagrid>
```

If your edit route's URL is `/entities/{entity}/{slug}/edit` and your row object looks as follows:
`{ id: 1, name: "test", slug: "some-slug" }`, the generated edit URL will be: `/entities/1/some-slug`.

Another situation will be that the route requires parameters that are not even in the row object. Say for example you
have a table showing all the articles in a specific category and this category needs to be passed into the URL as well:

``` html
<datagrid
    [...]
    routes="create: 'entity_create', edit: 'entity_update', delete: 'entity_delete'"
    route-parameters="{ category_id: {{ category.id }} }"
></datagrid>
```

Note that in this situation, category.id _is_ a twig variable and in the HTML will show up as an integer.

This will enable you to generate URL's for routes like `/articles/{category_id}/article/{id}/edit`, even if the
category_id is unknown to the row object.

Finally, if the category_id property _is_ available on the row object, you can add it as a custom property to generated
URL's using the second (or first, in case of `createPath()`) argument:

``` html
<a ng-href="{{ deletePath(row, { category_id: row.category_id }) }}">Delete entity</a>
```

Note that for this situation the id-map attribute is more appropriate, but in other situations this might be the best
option.

## Inline editing

In order to enable inline editing, first of all you'll need to define a form template:

``` html
<datagrid
    [...]
    form-template="form-template"
></datagrid>

<script type="text/ng-template" id="form-template">
    <tr>
        <td>{{ '{{ row.id }}' }}</th>
        <td><div datagrid-errors="name"></div> <input ng-model="row.name"></td>
        <td><div datagrid-errors="description"></div> <input ng-model="row.description"></td>
        <td><div datagrid-errors="startDate"></div><div datagrid-errors="endDate"></div>  <input type="date" ng-model="row.startDate"> - <input type="date" ng-model="row.endDate"></td>
        <td><a ng-click="save(row)">Save</a> <a ng-click="cancel(row)">Cancel</a></td>
    </tr>
</script>
```

More information about the [ng-model directive](http://docs.angularjs.org/api/ng.directive:ngModel).

The datagrid-errors directive will show any validation errors. You could use Symfony's formview to generate this form,
but you'll still have to add the ng-model attribute to each field. For example:


``` html
    <td>
        <div datagrid-errors="description"></div>
        {{ form_widget(form.description, { attr: { 'ng-model': 'description' } }) }}
    </td>
```

Alternatively you could set this attribute in your FormType or even create a FormExtension to add it automatically.

To trigger the inline editing, you'll need to update your links. Update the links as follows:

Before:
``` html
    <a ng-href="{{ createPath() }}">New entity</a>
    <a ng-href="{{ editPath(row) }}">Edit entity</a>
    <a ng-href="{{ deletePath(row) }}">Delete entity</a>
```

After:
``` html
    <a ng-click="{{ create() }}">New entity</a>
    <a ng-click="{{ edit(row) }}">Edit entity</a>
    <a ng-click="{{ delete(row) }}">Delete entity</a>
```

You are free to handle the requests by yourself, but for convenience sake, we have created a helper service which will
ease things up for you: [samson_datagrid.controller_helper](../../Helper/ControllerHelper.php).

To make things even more easy, we have created a abstract controller with
some methods to help you on the way: [AbstractDataGridController](../../Controller/AbstractDataGridController.php).

If you choose to handle the requests on your own, note the following expectations from your controller:

  - The create action will be called with method POST
  - The edit action will be called with method PUT
  - The delete action will be called with method DELETE

  - All controllers will return a 200 (optionally 201, create) response on success.
  - The edit and create controllers will return the updated or created entity, serialized the same way the index controller did.
  - The delete controller will return no content.

  - All controllers will return a 400 response on failure.
  - The edit and create controllers will return a serialized form object or output similar to it.
  - The delete controller will simply return a reason for failure.