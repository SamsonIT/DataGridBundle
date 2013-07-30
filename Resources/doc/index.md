Using SamsonDataGridBundle
===================

Welcome to SamsonDataGridBundle!

**Basic Docs**

* [Installation](#installation)
* [Basic usage](#basic-usage)
* [A KNP paginator powered menu](#knp-paginator)

<a name="installation"></a>

## Installation

### Step 1) Composer

Run the following command from your project root:

    composer.phar require samson/data-grid-bundle

### Step 2) Register the bundle

To start using the bundle, register it in your Kernel:

``` php
<?php
// app/AppKernel.php

public function registerBundles()
{
    $bundles = array(
        // ...
        new Samson\Bundle\DataGridBundle\SamsonDataGridBundle(),
    );
    // ...
}
```

### Step 3) Include the Javascript files

The easiest way to do this is to include the bundles twig file from your template:

    {% include 'SamsonDataGridBundle::javascripts.js' %}

This will use [assetic](https://github.com/symfony/AsseticBundle) to compile the source into one file (or multiple if debug is on).

### Step 4) Add the module to your angular app

See an explanation of how to do this [here](http://docs.angularjs.org/guide/bootstrap)

Basically, if you already have an Angular app running, add the module to the dependencies list:

    angular.module('your-app-name', ['Samson.DataGrid']);

<a name="basic-usage"></a>

## Basic usage

Adding a datagrid to your webpage is really easy. All you have to do is add the tag to your HTML code:

``` html
<datagrid></datagrid>
```

This won't do much yet, though, as there is no data in it yet. Say for example you have an array of entities in a
Twig variable called "entities", here's how you can add it:

``` html
<datagrid
    data="{{ entities|serialize }}"
></datagrid>
```

How you serialize the entities is up to you. I suggest using the [SamsonDataViewBundle](https://github.com/SamsonIT/DataViewBundle).

If you refresh now, you'd see a table with one header row, and one body row for each entity that was in the `entities` array.
The messages are pretty clear though, you need to add body and header templates. Here's how:

``` html
<datagrid
    body-template="body-template"
    header-template="header-template"
    data="{{ entities|serialize }}"
></datagrid>
```

These can be references to files, or to inline templates. An example header template:

``` html
<script type="text/ng-template" id="header-template">
    <tr>
        <th>ID</th>
        <th sortable="name">Name</th>
        <th sortable="description">Description</th>
        <th sortable="startDate">Period</th>
    </tr>
</script>
```

You'll now see that the table has a header column. As you can see, I've added the `sortable` attribute to some of the columns.
Defining these attributes will enable sorting on the field defined in that column. Sorting is done using the standard AngularJS
[orderBy filter](http://docs.angularjs.org/api/ng.filter:orderBy). The text value of the attribute is used as the second argument
to the function filter call.

Now we can go on to the body template. An example:

``` html
<script type="text/ng-template" id="body-template">
    <tr>
        {% verbatim %}
        <td>{{ row.id }}</th>
        <td>{{ row.name }}</td>
        <td>{{ row.description }}</td>
        <td>{{ row.startDate }} - {{ row.endDate }}</td>
        {% endverbatim %}
    </tr>
</script>
```

The values between {{ }} here are actually angular variables. I'm using [verbatim](http://twig.sensiolabs.org/doc/tags/verbatim.html)
to make sure twig doesn't parse them. Other than that, the template isn't very special. As you can see, the entity properties
are available through the `row` variable.

Finally the datagrid also supports quick filtering. Add the following attribute to your `datagrid` element:

``` html
<datagrid
   [...]
   filter-columns="name,description"
></datagrid>
```

An input field will now appear above your table which instantly filters down the data in it as you type. It looks for matches
in the entity properties you supplied comma separated.

That's it. You now have a full blown datagrid with sorting, pagination and quick filtering!


<a name="knp-paginator"></a>

## A KNP paginator powered menu

Note: this method requires the JSRoutingBundle and requires that your index route is exposed.

The above example is nice for smallish data sets (it has been tested on a dataset of thousands of records, but sending
all this data to your client at once is not going to be a big success in the long run).

You can fairly easily change the behaviour of the datagrid to work with a Pagination object.

In this example, the entities variable holds a [SlidingPagination object](https://github.com/KnpLabs/knp-components/blob/master/src/Knp/Component/Pager/Pagination/SlidingPagination.php).


``` html
<script type="text/ng-template" id="header-template">
    <tr>
        <th>ID</th>
        <th sortable="e.name">Name</th>
        <th sortable="e.description">Description</th>
        <th sortable="e.startDate">Period</th>
    </tr>
</script>
```

``` html
<script type="text/ng-template" id="body-template">
    <tr>
        {% verbatim %}
        <td>{{ row.id }}</th>
        <td>{{ row.name }}</td>
        <td>{{ row.description }}</td>
        <td>{{ row.startDate }} - {{ row.endDate }}</td>
        {% endverbatim %}
    </tr>
</script>

<datagrid
    body-template="body-template"
    header-template="header-template"
    data="{{ entities|serialize }}"
    filter-columns="e.name,e.description"
    driver="knp-paginator"
></datagrid>
```

Some notable things have changed here:

### driver

The driver attribute has been added to the datatable. It defaults to [clientside](../public/js/services/clientside.js), but in this
case we want to use the [knp-paginator](../public/js/services/knp_paginator.js) driver.

### sortable and filter-columns

These fields are now based on query components. If your query builder is this:

``` php
$qb = $em->getRepository('some repository')->createQueryBuilder('e');
```

The query builder is aliased "e", which is the same "e" you see in the attributes above.

Note: the filtering currently only works if you pass a QueryBuilder object into the paginator. Query objects are currently NOT supported.

### server side

As you can now see, whenever you paginate, filter or sort, an AJAX request is issued to the same controller as where the paginator
was instantiated. You're now responsible for answering the datagrid's request with a serialized version of the Pagination object.

For example, you can implement is as follows:

```php
    [...]

    public function indexController($_format = 'html') {
        [...]

        $pagination = [...];

        $serializer = $this->get('jms_serializer');
        if ('html' == $_format) {
            return new Response($serializer->serialize($pagination, 'json'), 200, array('content-type' => 'text/json'));
        }

        return array('entities' => $pagination);
    }
```

The knp-paginator driver will add the _format attribute to all generated URL's.

That's it. Your datagrid now works server side.