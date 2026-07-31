# Remix of Insight Canvas

i want you to create frontend only app and i want it to be like powerbi with all the functionalities Power BI is Microsoft's business intelligence platform for connecting to data, transforming it, building data models, and creating interactive reports and dashboards. It has three main pieces — Power BI Desktop (where you build), Power BI Service (the cloud where you publish/share), and Power BI Mobile — plus Power BI Report Builder for paginated reports. Here's a full breakdown.

Power BI Desktop — the ribbon tabs

File
Open, save, save as, publish, export, options/settings, and recent sources.

Home
The main hub: connect to various data sources, refresh and transform data using the Power Query Editor, and publish reports to the Power BI Service. Also has: Recent Sources, Enter Data (manual tables), Transform Data (opens Power Query), Refresh, insert a new visual quickly, manage relationships, and Publish. Microsoft Press Store

Insert
Insert different visuals, text boxes, buttons, shapes, and images, plus AI visuals, Q&A (natural-language query box), and buttons/actions/bookmarks navigation elements. This is where you add a new report page too. Travers Data

Modeling
Create DAX measures, or even new columns and tables, and also set up a security model if we need some users to only see some data (Row-Level Security). Also: manage relationships between tables, create calculation groups, mark a date table, set up parameters, and manage roles. Travers Data

View
Set a theme for our reports, set up mobile layouts, and access other panes that don't show up by default — like the Selection pane, Bookmarks pane, Sync slicers, gridlines/snap-to-grid, and page background/wallpaper settings. The Themes gallery on the View tab shows previews of color combinations and fonts, similar to PowerPoint themes. Travers DataMicrosoft Learn

Optimize
Performance analyzer (see how long each visual takes to render) and diagnostics for slow reports.

Help
Documentation links, "What's new," training videos, and community forums.

The ribbon itself is context-aware — it dynamically displays and arranges icons based on context, showing only the options available to you, can be collapsed to save space, and supports keyboard navigation with Alt keytips. Microsoft Learn

Power Query Editor (data transformation)

Opened via "Transform Data." The ribbon in Power Query Editor consists of tabs: Home, Transform, Add Column, View, Tools, and Help. Microsoft Learn

Home – connect to new sources, manage queries, merge/append queries, refresh preview

Transform – pivot/unpivot columns, split columns, change data types, group by, replace values, extract text

Add Column – custom columns, conditional columns, index columns, date/time extraction columns

View – formula bar, advanced editor (raw M code), query dependencies diagram

Tools – query diagnostics, options

Data & modeling capabilities

Connects to hundreds of sources: Excel, SQL Server, SharePoint, web APIs, Salesforce, Google Analytics, Snowflake, Azure services, and more

Builds a data model with relationships between tables (star schema support)

DAX (Data Analysis Expressions) for measures, calculated columns, and calculated tables

Composite models, aggregations, and Direct Lake / DirectQuery / Import storage modes for performance

Calculation groups, visual calculations, and custom totals for advanced analytics

Visualization & reporting

Dozens of native visuals (bar/line/pie charts, maps, matrices, KPI cards) plus a large marketplace of custom visuals (AppSource)

Conditional formatting, drill-through pages, bookmarks, buttons, tooltips, and slicers for interactivity

Report themes, custom layouts for mobile, and now report-wide "modern visual defaults" for consistent styling

Copilot / AI features

Power BI now includes Copilot for: summarizing report content, autogenerating measure descriptions, answering natural-language questions about your data (Q&A), and conversational chat in Power BI Mobile.

Power BI Service (cloud/web)

Publish reports and build dashboards (pinned tiles from multiple reports)

Workspaces for collaboration, plus apps for distributing polished report bundles to broader audiences

Scheduled data refresh, gateways for on-prem data, alerts, subscriptions

Row-level security enforcement, sharing/permissions management

Paginated reports (pixel-perfect, print-style) via Report Builder

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b3bb860-e190-4b5b-9687-464eb3609704).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
