SamsonDataGridBundle
=============
The `SamsonDataGridBundle` provides an AngularJS based table renderer. Using a simple html tag you can easily implement
a fully interactive client side data table even supporting inline editing.

### How does this work?

You can find the documentation for this bundle in the `Resources/doc`
directory of the bundle:

* Read the [SamsonDataGridBundle documentation](https://github.com/SamsonIT/DataGridBundle/blob/master/Resources/doc/index.md)

Basic example usage:
--------------

Normal:
```
    <script type='text/ng-template' id="header-template.html">
        <tr>
            <th sortable="id">Id</th>
            <th sortable="name">Name</th>
            <th sortable="port">Port</th>
            <th sortable="ip">Ip</th>
            <th colspan="2"><a ng-click="create()"">{{ icon('create') }}</a></th>
        </tr>
    </script>
    <script type='text/ng-template' id="body-template.html">
        <tr>
            {% verbatim %}
            <td>{{ row.id }}</td>
            <td>{{ row.name}}</td>
            <td>{{ row.port}}</td>
            <td>{{ row.ip }}</td>
            {% endverbatim %}
            <td><inline ng-show="isEditable(row)" href="{{ '{{ editPath(row) }}' }}" action='edit'>{{ icon('edit') }}</inline></td>
            <td><a ng-href="{{ '{{ deletePath(row) }}' }}">{{ icon('delete') }}</a></td>
        </tr>
    </script>
    <script type='text/ng-template' id="form-template.html">
        {% verbatim %}
        <tr ng-show="hasErrors"><td colspan="{{ columnCount }}"><div datagrid-errors></div></td></tr>
        <tr>
            <td>{{ row.id }}</td>
            <td><div datagrid-errors="name"></div><input type="text" name="name" ng-model="row.name"></td>
            <td><div datagrid-errors="port"></div><input type="number" ng-model="row.port"></td>
            <td><div datagrid-errors="ip"></div><input type="ip" ng-model="row.ip"></td>
            {% endverbatim %}
            <td><button ng-click="save(row)">Save</button></td>
            <td><button ng-click="cancel(row)">Cancel</button></td>
        </tr>
    </script>

    <datagrid
        header-template="header-template.html"
        body-template="body-template.html"
        form-template="form-template.html"
        data="{{ printers|serialize }}"
        filter-columns="name,ip"
        routes="create: 'printer_zebra_create', edit: 'printer_zebra_edit', delete: 'printer_zebra_delete'"
    ></datagrid>
```

Server side, powered by KnpPaginator:
```
    <script type='text/ng-template' id="header-template.html">
        <tr>
            <th>id</th>
            <th sortable="e.firstName">First name</th>
            <th>preposition</th>
            <th sortable="e.lastName">last_name</th>
            <th colspan="2"><a ng-href="{{ '{{ createPath() }}' }}">{{ icon('create') }}</a></th>
        </tr>
    </script>
    <script type='text/ng-template' id="body-template.html">
        <tr>
            {% verbatim %}
            <td>{{ row.id }}</td>
            <td>{{ row.first_name }}</td>
            <td>{{ row.preposition }}</td>
            <td>{{ row.last_name }}</td>
            {% endverbatim %}
            <td><a ng-show="isEditable(row)" ng-href="{{ '{{ editPath(row) }}' }}">{{ icon('edit') }}</a></td>
            <td><a ng-href="{{ '{{ deletePath(row) }}' }}">{{ icon('delete') }}</a></td>
        </tr>
    </script>

    <datagrid
        header-template="header-template.html"
        body-template="body-template.html"
        data="{{ entities|serialize }}"
        driver="knp-paginator"
        routes="create: 'person_new', edit: 'person_edit', delete: 'person_delete'"
        filter-columns="e.firstName,e.lastName"
    ></datagrid>
```