# Application Class Diagram — UML 2.5 Text Version

Text rendering of the application's domain model following UML 2.5 notation.
Visual diagram: `class-diagram.drawio`.

## Notation (UML 2.5)

| Symbol | Meaning |
| ------ | ------- |
| `A ────▷ B` | **Generalization** — A inherits from (is a subtype of) B; arrow points at the supertype |
| `A - - ▷ B` | **Realization** — A implements interface / trait contract B |
| `A ▸── B` | **Composition** — B is a part of A; B's life cycle is bound to A (whole = filled diamond end) |
| `A ◇── B` | **Aggregation** — B is a part of A, but may exist independently (whole = hollow diamond end) |
| `A ──── B` | **Association** — plain structural link between independent classes |
| `n`, `n..m`, `*` | **Multiplicity** at each end of a relationship |
| `<<entity>>` | Stereotype — persistent domain class (maps to a database table) |
| `<<abstract>>` | Abstract class (framework superclass, never instantiated) |
| `<<trait>>` | Reusable behaviour mixed into a class |
| `{FK → table}` | Database foreign key target |

---

## 0. Framework superclasses (Laravel Eloquent)

All domain classes are persistent `<<entity>>` classes that inherit the
active-record behaviour of the framework's base classes.

```
                        ┌────────────────────────────┐
                        │   <<abstract>> Model       │  Illuminate\Database\Eloquent\Model
                        └─────────────┬──────────────┘
                                      ▲
                                      │ generalization
                    ┌─────────────────┼──────────────────┐
                    │                 │                  │
        ┌───────────┤        ┌────────┤─────────┐        │
        │           │        │        │         │        │
  <<abstract>>   Role      Setting   Endpoint  Measure   MeasureJoin
  Authenticatable              │     Dataset            │
        ▲                      │                        │
        │                      │                        │
      User                     │                        │
                                └─────── (see below) ───┘
```

- **`Model`** (`<<abstract>>`) — base class of every entity.
- **`Authenticatable`** (`<<abstract>>`) — extends `Model`; adds authentication (credentials, remember token).
- **`User`** — extends `Authenticatable`. Implements (realization):
  - `AuthenticatableContract`, `CanResetPasswordContract` (via framework)
  - uses `<<trait>> Notifiable` → realizes `NotifiableContract`
  - uses `<<trait>> HasFactory`
- **`Role`, `BuilderPage`, `BuilderPageGroup`, `BuilderPageAccess`, `BuilderPagePlacement`** — extend `Model`; use `<<trait>> HasFactory`.
- **`AuditLog`** — extends `Model`; uses `<<trait>> SoftDeletes` (adds `deleted_at`).

Generalization summary (who inherits whom):

| Class | Superclass | Kind |
| ----- | ---------- | ---- |
| `User` | `Authenticatable` | generalization |
| `Authenticatable` | `Model` | generalization |
| `Role`, `Setting`, `EndpointDataset`, `Measure`, `MeasureJoin`, `BuilderPage`, `BuilderPageGroup`, `BuilderPageAccess`, `BuilderPagePlacement`, `BuilderActivityLog`, `AuditLog` | `Model` | generalization |

---

## 1. User  `<<entity>>`

**Table:** `users`

**Attributes**

| Attribute            | Type       | Notes                           |
| -------------------- | ---------- | ------------------------------- |
| id                   | Long       | PK                              |
| name                 | String     |                                 |
| matricule            | String     | {unique}, nullable              |
| email                | String     | {unique}, nullable              |
| password             | String     | hashed, hidden from serialization |
| role_id              | Long       | {FK → roles}, nullable          |
| is_active            | Boolean    | default true                    |
| must_change_password | Boolean    | default false                   |
| last_login_ip        | String     | nullable                        |
| last_login_at        | DateTime   | nullable                        |

**Operations**

| Operation              | Return  |
| ---------------------- | ------- |
| role(): Role           | query   |
| hasRole(slugs): Boolean|         |
| canAccess(page): Boolean|         |

**Relationships**

| Target                   | Kind        | Cardinality (at target) | Notes                        |
| ------------------------ | ----------- | ----------------------- | ---------------------------- |
| Role                     | association | 0..1                    | one user → at most one role  |
| Measure                  | association | *                       | user authors measures        |
| MeasureJoin              | association | *                       | user authors joins           |
| BuilderPage              | association | *                       | user is owner (owner_user_id)|
| BuilderPageGroup         | association | *                       | user is owner (owner_user_id)|
| BuilderPagePlacement     | association | *                       | via association class, see §11 |
| BuilderActivityLog       | association | *                       |                               |
| AuditLog                 | association | *                       |                               |
| Authenticatable          | generalization | —                    | superclass                   |

---

## 2. Role  `<<entity>>`

**Table:** `roles`

**Attributes**

| Attribute | Type   |
| --------- | ------ |
| id        | Long   | PK
| name      | String |
| slug      | String | {unique}

**Operations**

| Operation     | Return  |
| ------------- | ------- |
| users(): Set  | query   |

**Relationships**

| Target | Kind        | Cardinality (at target) |
| ------ | ----------- | ----------------------- |
| User   | association | *                       |

**Note — "admin":** the administrator is **not** a subtype of `Role`.
Administration is a *role instance* with `slug = 'it'` ("IT / Administrateur",
`RoleSeeder`). The `/admin` page is served to any authenticated user
(`routes/web.php:29`) and admin CRUD APIs are protected by the `role:it`
middleware. An instance value would appear in an object diagram, not a class
diagram; modelling it as a class would be incorrect UML.

---

## 3. AuditLog  `<<entity>>`

**Table:** `audit_logs` — uses `<<trait>> SoftDeletes`; no `updated_at` column.

**Attributes**

| Attribute   | Type     |
| ----------- | -------- |
| id          | Long     | PK
| user_id     | Long     | {FK → users}, nullable
| action_type | Enum     | INFO, USER, WARN, ERROR, SYSTEM, LOGIN, LOGIN_FAILED, LOGOUT
| message     | Text     |
| ip_address  | String   | nullable
| user_agent  | String   | nullable
| created_at  | DateTime |

**Operations** (all static)

| Operation                                   | Return |
| ------------------------------------------- | ------ |
| log(type, message, request): void           |        |
| info(message): void                         |        |
| error(message): void                        |        |

**Relationships**

| Target | Kind        | Cardinality (at target) |
| ------ | ----------- | ----------------------- |
| User   | association | 0..1                    |

---

## 4. Setting  `<<entity>>`

**Table:** `settings` — standalone (no navigable associations).

**Attributes**

| Attribute  | Type     |
| ---------- | -------- |
| id         | Long     | PK
| key        | String   | {unique}
| value      | String   | nullable
| updated_by | Long     | no FK constraint

**Operations** (static)

| Operation                          | Return |
| ---------------------------------- | ------ |
| get(key, default): mixed           | cached 30 s |
| set(key, value, updatedBy): void   | upsert + cache invalidation |

---

## 5. EndpointDataset  `<<entity>>`

**Table:** `endpoint_datasets` — standalone (no navigable associations).

**Attributes**

| Attribute      | Type     |
| -------------- | -------- |
| id             | Long     | PK
| slug           | String   | {unique}
| name           | String   |
| label          | String   | nullable
| object         | String   | nullable
| object_type    | String   | nullable
| source         | String   | nullable
| method         | String   | default "GET"
| columns        | JSON     | cast to array
| sample_data    | JSON     | cast to array
| row_count      | Integer  | default 0
| last_status    | String   | default "pending"
| last_error     | Text     | nullable
| last_synced_at | DateTime | nullable

---

## 6. Measure  `<<entity>>`

**Table:** `measures`

**Attributes**

| Attribute   | Type     |
| ----------- | -------- |
| id          | Long     | PK
| name        | String   | {unique}
| expression  | Text     |
| description | Text     | nullable
| config      | JSON     | cast to array
| category    | String   | nullable
| user_id     | Long     | {FK → users}, nullable

**Operations**

| Operation    | Return |
| ------------ | ------ |
| user(): User | query  |

**Relationships**

| Target | Kind        | Cardinality (at target) |
| ------ | ----------- | ----------------------- |
| User   | association | 0..1                    |

---

## 7. MeasureJoin  `<<entity>>`

**Table:** `measure_joins`

**Attributes**

| Attribute    | Type    |
| ------------ | ------- |
| id           | Long    | PK
| table_a      | String  |
| column_a     | String  |
| table_b      | String  |
| column_b     | String  |
| trim_compare | Boolean | default true
| user_id      | Long    | {FK → users}, nullable

**Operations**

| Operation    | Return |
| ------------ | ------ |
| user(): User | query  |

**Relationships**

| Target | Kind        | Cardinality (at target) |
| ------ | ----------- | ----------------------- |
| User   | association | 0..1                    |

---

## 8. BuilderPageGroup  `<<entity>>`

**Table:** `builder_page_groups`

**Attributes**

| Attribute     | Type    |
| ------------- | ------- |
| id            | Long    | PK
| name          | String  |
| slug          | String  | {unique}
| owner_user_id | Long    | {FK → users}, nullable
| sort_order    | Integer | default 0

**Operations**

| Operation                  | Return   |
| -------------------------- | -------- |
| pages(): Set<BuilderPage>  | query    |
| owner(): User              | query    |

**Relationships**

| Target               | Kind         | Cardinality (at target) | Notes |
| -------------------- | ------------ | ----------------------- | ----- |
| BuilderPage          | **aggregation** `◇` | *             | group is the aggregate (whole); pages survive group deletion ({nullOnDelete}) → weak/shared ownership |
| BuilderPagePlacement | association  | *                       |       |
| BuilderActivityLog   | association  | *                       |       |
| User                 | association  | 0..1                    | owner |

---

## 9. BuilderPage  `<<entity>>`

**Table:** `builder_pages`

**Attributes**

| Attribute          | Type    | Notes                    |
| ------------------ | ------- | ------------------------ |
| id                 | Long    | PK                       |
| slug               | String  | {unique}                 |
| name               | String  |                          |
| owner_user_id      | Long    | {FK → users}, nullable   |
| layout             | JSON    | cast to array            |
| layout_draft       | JSON    | cast to array, nullable  |
| layout_draft_updated_at | DateTime | nullable             |
| group_id           | Long    | {FK → builder_page_groups}, nullable |
| sort_order         | Integer | default 0                |

**Operations**

| Operation                       | Return   |
| ------------------------------- | -------- |
| group(): BuilderPageGroup       | query    |
| owner(): User                   | query    |
| accessRows(): Set<BuilderPageAccess> | query |

**Relationships**

| Target                   | Kind         | Cardinality (at target) | Notes |
| ------------------------ | ------------ | ----------------------- | ----- |
| BuilderPageGroup         | aggregation  | 0..1                    | part in the group aggregate (diamond at group end) |
| BuilderPageAccess        | **composition** `▸` | *             | access rows cascade-delete with the page → life-cycle bound |
| BuilderPagePlacement     | composition  | *                       | placement cascade-deletes with the page |
| BuilderActivityLog       | association  | *                       | log detaches ({nullOnDelete}) |
| User                     | association  | 0..1                    | owner |

---

## 10. BuilderPageAccess  `<<entity>>`

**Table:** `builder_page_access` — unique (page_id, user_id).

**Attributes**

| Attribute | Type   |
| --------- | ------ |
| id        | Long   | PK
| page_id   | Long   | {FK → builder_pages, cascadeOnDelete}
| user_id   | Long   | {FK → users, cascadeOnDelete}
| mode      | Enum   | view, edit

**Operations**

| Operation            | Return |
| -------------------- | ------ |
| page(): BuilderPage  | query  |
| user(): User         | query  |

**Relationships**

| Target       | Kind          | Cardinality (at target) | Notes |
| ------------ | ------------- | ----------------------- | ----- |
| BuilderPage  | composition   | 1                       | part of page (filled diamond at page end) |
| User         | composition   | 1                       | access grant dies with the user |

---

## 11. BuilderPagePlacement  `<<entity>>`

**Table:** `builder_page_placements` — unique (user_id, page_id).

> **UML note:** this is an **association class**. It adds properties
> (`group_id`, `sort_order`) to the many-to-many association between `User` and
> `BuilderPage` — i.e. *which user has which page placed where in the sidebar*.

**Attributes**

| Attribute  | Type    |
| ---------- | ------- |
| id         | Long    | PK
| user_id    | Long    | {FK → users, cascadeOnDelete}
| page_id    | Long    | {FK → builder_pages, cascadeOnDelete}
| group_id   | Long    | {FK → builder_page_groups}, nullable
| sort_order | Integer | default 0

**Operations**

| Operation                     | Return |
| ----------------------------- | ------ |
| user(): User                  | query  |
| page(): BuilderPage           | query  |
| group(): BuilderPageGroup     | query  |

**Relationships**

| Target               | Kind          | Cardinality (at target) | Notes |
| -------------------- | ------------- | ----------------------- | ----- |
| User                 | composition   | 1                       | placement cascade-deletes with the user |
| BuilderPage          | composition   | 1                       | placement cascade-deletes with the page |
| BuilderPageGroup     | association   | 0..1                    | group detaches ({nullOnDelete}) |

---

## 12. BuilderActivityLog  `<<entity>>`

**Table:** `builder_activity_logs` — no `updated_at` column.

**Attributes**

| Attribute   | Type     |
| ----------- | -------- |
| id          | Long     | PK
| user_id     | Long     | {FK → users}, nullable
| page_id     | Long     | {FK → builder_pages}, nullable
| page_slug   | String   | nullable
| page_name   | String   | nullable
| group_id    | Long     | {FK → builder_page_groups}, nullable
| widget_id   | String   | nullable
| widget_type | String   | nullable
| kpi_code    | String   | nullable
| action      | String   |
| detail      | JSON     | cast to array
| ip_address  | String   | nullable
| user_agent  | String   | nullable
| created_at  | DateTime |

**Operations**

| Operation                | Return |
| ------------------------ | ------ |
| user(): User             | query  |
| page(): BuilderPage      | query  |
| group(): BuilderPageGroup| query  |

**Relationships**

| Target           | Kind        | Cardinality (at target) |
| ---------------- | ----------- | ----------------------- |
| User             | association | 0..1                    |
| BuilderPage      | association | 0..1                    |
| BuilderPageGroup | association | 0..1                    |

---

## Full relationship model (UML 2.5 notation)

```
Role ◄──────────────────────────── User ──────────────▷ Model
      association (0..1 role)         │ generalization   (via Authenticatable)
                                      │
            ┌────────────┬────────────┼──────────┬──────────────┬──────────────┐
            │            │            │          │              │              │
      association  association   association   association   association   association
            │            │            │          │              │              │
         Measure     MeasureJoin  BuilderPageGroup   BuilderPage   BuilderActivityLog  AuditLog
                                     │  ◇          │  ▸
                                     │  aggregation │  composition
                                     │              │
                                     └───┐     ┌────┘
                                     BuilderPageAccess
                                     (composition from page & user)

BuilderPage ◄── User (association class: BuilderPagePlacement)
BuilderPagePlacement ── composition from both User and BuilderPage
```

---

## Relationship-type decision table

| Relationship | UML kind | Why |
| ------------ | -------- | --- |
| `BuilderPageGroup → BuilderPage` | **Aggregation** | Pages survive group deletion ({nullOnDelete}) — shared/weak ownership |
| `BuilderPage → BuilderPageAccess` | **Composition** | Access rows cascade-delete with the page — life-cycle bound |
| `User → BuilderPageAccess` | **Composition** | Grant rows cascade-delete with the user |
| `User → BuilderPagePlacement`, `BuilderPage → BuilderPagePlacement` | **Composition** | Placement cascade-deletes with user or page; modeled as association class |
| `User → Measure / MeasureJoin / BuilderPage / BuilderPageGroup / BuilderActivityLog / AuditLog` | **Association** | Independent entities; FK is {nullOnDelete} — neither owned nor life-cycle bound |
| `BuilderPageGroup → BuilderPagePlacement / BuilderActivityLog` | **Association** | Detach on delete ({nullOnDelete}) |
| `Role → User` | **Association** | Plain structural link |
| `User → Authenticatable → Model` (and all entities → `Model`) | **Generalization** | Inheritance |
| Traits (`HasFactory`, `Notifiable`, `SoftDeletes`) | **Realization** | Behavioural contracts mixed in |