# Project Overview

Astro (version 6) frontend that consumes data from directus headless CMS using the `directus SDK` [documentation](https://directus.io/docs/guides/connect/sdk) and display the content in two languages, english `en` and german `de`. The pages have sections that contain the translated content.

## Detailed description
In Directus there is a collection called `page` which represent webpages. Each page is composed by "sections". "Sections" can be items of following collections `block`, `grid`, `hero` or `slider` using a collection relationship of type "many to any". using `sort` field as sorting.

The sections `block`, `grid` and `hero` have translations with a field called `content`.

Each `page` is set into the dynamic route `src/pages/[lang]/[...slug].astro`

A `slider` is a container of "slides" of type `block`, `grid` or `hero` following the same "many to any" relationship with them. So that you can have a slider of grid, hero or block.

This skill is used to create, review, or refactor Astro components that consume Directus page data, including handling of sections, its items, and translations.

## Page sections
In directus, there are different content types which compose the sections of the page.

Section types:

- **Block**: A simple content component. It uses the "block editor" JSON output. Translated field `content`
- **Grid**: A two column layout where each column has the "block editor" JSON output. Translated field `content`
- **Hero**: A Simple bakcground image with a title and description. Translated field `content`

- **Slider**: A collection of `block`, `grid` or `hero` .No translations. Just container for other content types: `block`, `grid` and `hero` using the `sort` field as sorting.

Each of these sections can be translated, and the page can have multiple blocks of each type. When creating or refactoring Astro components to consume this data, consider the following:

## URL structure

The pages should be accessed with their `slug` field and the URL should have the language, for example "/en/about" or "/de/projects"

## Considerations

1. Under `./src/lib/directus` create or update a query file that takes care of each of these sections, and make sure to include the necessary fields and translations in the query. Then, create or update Astro components that consume this data and render it appropriately, keeping in mind the structure of the data and the need for translations.

2. `page` do not have translations, they act as container for the sections, and the sections are the ones that have the translations. For fetching of "blocks", "grids" and "hero" do take the translations, as they are the ones that have the content.

3. Create necesary types for each of the sections and place it on `./src/lib/directus/types` and make sure to use them in the queries and components.

4. "slider" content type has many items, it acs as a container, using a `sort` numberic field as sorting. So for this sections make the query accordingly, so it fetches the translated items content.


## Astro Components

Each section should have its own Astro component that takes care of rendering the data appropriately. For example, a "Block" component that takes the block data and renders it using the "block editor" JSON output, a "Grid" component that takes the grid data and renders it in a two column layout (using CSS tailwind `grid grid-col-2`), a "Hero" component that takes the hero data and renders it with a background image, and a translated `content` (also "block editor" JSON type), and a "Slider" component takes an array of `hero`, `blocks`or `grid` and renders them in a navigable slider.

Place them under `./web/src/components/directus`

## Navigation

The navigation items should be built dynamically. In directus there is a collection called `menu` which has a one to many relationship with the collection `menu_item` and a field `slug` to identify it. `menu_item` has a `url` field and a translations field called `label`.

Under `./lib/directus/` should be also a folder `menu` where queries and logic regarding fetching a menu by `slug`. This logic should be consumed by a component called `Menu` where the links to the url and the label are build. 

## Language Switcher

There should also be a component under `./web/src/components/layout` that handles the language switch and mantains the page but the sections have their correspondent translations while keeping the URL structure with the language prefix `en` or `de`. I have build util functions under `./src/lib/i18n.ts` to achieve this, update or modify them if needed.

## Glossary
- **Block editor**: Block-styled editor for rich media stories, outputs clean data in JSON using Editor.js



