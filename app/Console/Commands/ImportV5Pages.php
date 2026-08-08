<?php

namespace App\Console\Commands;

use App\Models\BuilderPage;
use App\Models\BuilderPageGroup;
use App\Models\EndpointDataset;
use App\Models\Measure;
use App\Models\MeasureJoin;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImportV5Pages extends Command
{
    protected $signature = 'v5:import
        {--in=v5-pages.json : Export file to read from storage/app/private}
        {--no-rewrite : Do not rewrite V7 image URLs to the final route}';

    protected $description = 'Import builder_pages_v5 export into the final builder_pages table (idempotent upsert)';

    public function handle(): int
    {
        $path = (string) $this->option('in');

        if (! Storage::disk('local')->exists($path)) {
            $this->error("Export not found: storage/app/private/{$path}. Run `php artisan v5:export` first.");

            return self::FAILURE;
        }

        $payload = json_decode((string) Storage::disk('local')->get($path), true);

        if (! is_array($payload)) {
            $this->error('Export file is invalid JSON.');

            return self::FAILURE;
        }

        $rewrite = ! (bool) $this->option('no-rewrite');

        $this->syncUsers($payload['users'] ?? []);

        $userByEmail = User::pluck('id', 'email')->mapWithKeys(fn ($id, $email) => [strtolower((string) $email) => $id]);

        $userByV5Id = [];

        foreach (($payload['users'] ?? []) as $user) {
            $id = $userByEmail[strtolower((string) ($user['email'] ?? ''))] ?? null;

            if ($id !== null) {
                $userByV5Id[(int) $user['id']] = (int) $id;
            }
        }

        $this->info('Importing groups...');

        foreach (($payload['groups'] ?? []) as $group) {
            $id = (int) $group['id'];

            $model = BuilderPageGroup::find($id) ?? new BuilderPageGroup;

            $model->id = $id;

            $model->name = (string) ($group['name'] ?? '');

            $model->slug = (string) ($group['slug'] ?? Str::slug((string) ($group['name'] ?? 'imported')));

            $model->sort_order = (int) ($group['sort_order'] ?? 0);

            $model->save();
        }

        $imported = 0;

        $imageRefs = [];

        foreach (($payload['pages'] ?? []) as $page) {
            $id = (int) ($page['id'] ?? 0);

            if ($id <= 0) {
                $this->warn('  ✗ Skipping page with invalid id.');

                continue;
            }

            foreach (($page['image_urls'] ?? []) as $url) {
                $imageRefs[] = [$url, $id];
            }

            $layout = $page['layout'] ?? null;

            $draft = $page['layout_draft'] ?? null;

            if ($rewrite) {
                $layout = $this->rewriteImageUrls($layout);
                $draft = $this->rewriteImageUrls($draft);
            }

            if ($existing = BuilderPage::find($id)) {
                $existing->delete();
            }

            $model = new BuilderPage;

            $model->id = $id;

            $model->slug = (string) ($page['slug'] ?? 'page-'.$id);

            $model->name = (string) ($page['name'] ?? '');

            $model->owner_user_id = $this->ownerId($page['owner_user_id'] ?? null, $userByV5Id);

            $model->layout = $layout;

            $model->layout_draft = $draft;

            $model->layout_draft_updated_at = $this->parseDate($page['layout_draft_updated_at'] ?? null);

            $model->group_id = $this->parseInt($page['group_id'] ?? null);

            $model->sort_order = (int) ($page['sort_order'] ?? 0);

            $model->created_at = $this->parseDate($page['created_at'] ?? null);

            $model->updated_at = $this->parseDate($page['updated_at'] ?? null);

            $model->save();

            $imported++;
        }

        $this->info("Imported {$imported} page(s).");

        $this->importMeasures($payload['measures'] ?? [], $userByV5Id);

        $this->importMeasureJoins($payload['joins'] ?? [], $userByV5Id);

        $this->importDatasets($payload['datasets'] ?? []);

        if ($rewrite) {
            $this->info('V7 image URLs rewritten to /api/builder-pages/{id}/images/{file}.');
        }

        if ($imageRefs !== []) {
            $this->verifyImageFiles($imageRefs);
        }

        return self::SUCCESS;
    }

    /**
     * Bring the shared measure library (v5 i.e. `measures_v5`) into the final
     * `measures` table, preserving ids so layout references keep resolving.
     */
    private function importMeasures(array $measures, array $userByV5Id): void
    {
        $count = 0;

        foreach ($measures as $measure) {
            $id = (int) ($measure['id'] ?? 0);

            if ($id <= 0) {
                continue;
            }

            $existing = Measure::find($id);

            $model = $existing ?? new Measure;

            $model->id = $id;

            $model->name = (string) ($measure['name'] ?? '');

            $model->expression = (string) ($measure['expression'] ?? '');

            $model->description = $this->nullableValue($measure['description'] ?? null);

            $model->config = $measure['config'] ?? null;

            $model->category = $this->nullableValue($measure['category'] ?? null);

            $v5UserId = $measure['user_id'] ?? null;

            $model->user_id = $v5UserId !== null && $v5UserId !== ''
                ? ($userByV5Id[(int) $v5UserId] ?? null)
                : null;

            $model->created_at = $this->parseDate($measure['created_at'] ?? null);

            $model->updated_at = $this->parseDate($measure['updated_at'] ?? null);

            $model->save();

            $count++;
        }

        $this->info("Imported {$count} measure(s) into the shared library.");
    }

    /**
     * Bring the measure_joins rows into the final table (idempotent upsert).
     */
    private function importMeasureJoins(array $joins, array $userByV5Id): void
    {
        $count = 0;

        foreach ($joins as $join) {
            $id = (int) ($join['id'] ?? 0);

            if ($id <= 0) {
                continue;
            }

            $existing = MeasureJoin::find($id);

            $model = $existing ?? new MeasureJoin;

            $model->id = $id;

            $model->table_a = (string) ($join['table_a'] ?? '');

            $model->column_a = (string) ($join['column_a'] ?? '');

            $model->table_b = (string) ($join['table_b'] ?? '');

            $model->column_b = (string) ($join['column_b'] ?? '');

            $model->trim_compare = (bool) ($join['trim_compare'] ?? true);

            $v5UserId = $join['user_id'] ?? null;

            $model->user_id = $v5UserId !== null && $v5UserId !== ''
                ? ($userByV5Id[(int) $v5UserId] ?? null)
                : null;

            $model->save();

            $count++;
        }

        $this->info("Imported {$count} measure join(s).");
    }

    /**
     * Bring the captured endpoint datasets into the final `endpoint_datasets`
     * table, preserving ids/slugs so rows resolve against data.json.
     */
    private function importDatasets(array $datasets): void
    {
        $count = 0;

        foreach ($datasets as $dataset) {
            $id = (int) ($dataset['id'] ?? 0);

            if ($id <= 0) {
                continue;
            }

            $existing = EndpointDataset::find($id);

            $model = $existing ?? new EndpointDataset;

            $model->id = $id;

            $model->slug = (string) ($dataset['slug'] ?? '');

            $model->name = (string) ($dataset['name'] ?? '');

            $model->label = $this->nullableValue($dataset['label'] ?? null);

            $model->object = $this->nullableValue($dataset['object'] ?? null);

            $model->object_type = $this->nullableValue($dataset['object_type'] ?? null);

            $model->source = $this->nullableValue($dataset['source'] ?? null);

            $model->method = (string) ($dataset['method'] ?? 'GET');

            $model->columns = $dataset['columns'] ?? null;

            $model->sample_data = $dataset['sample_data'] ?? null;

            $model->row_count = (int) ($dataset['row_count'] ?? 0);

            $model->last_status = (string) ($dataset['last_status'] ?? 'ok');

            $model->last_error = $this->nullableValue($dataset['last_error'] ?? null);

            $model->last_synced_at = $this->parseDate($dataset['last_synced_at'] ?? null);

            $model->created_at = $this->parseDate($dataset['created_at'] ?? null);

            $model->updated_at = $this->parseDate($dataset['updated_at'] ?? null);

            $model->save();

            $count++;
        }

        $this->info("Imported {$count} endpoint dataset(s).");
    }

    private function nullableValue(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }

    /**
     * Bring v5 users into the final users table.
     *
     * Existing users (matched by email) get their V7 bcrypt password restored
     * and `must_change_password` cleared, so they can sign in with the password
     * they already know. Missing users are created with the v5 role and
     * password (or a random password + forced reset when v5 had none).
     */
    private function syncUsers(array $users): void
    {
        $created = 0;

        foreach ($users as $user) {
            $email = strtolower((string) ($user['email'] ?? ''));

            if ($email === '') {
                continue;
            }

            $password = $this->passwordHash($user);

            $dbUser = User::whereRaw('LOWER(email) = ?', [$email])->first();

            if ($dbUser) {
                if ($password !== null) {
                    $dbUser->password = $password;

                    $dbUser->must_change_password = false;

                    $dbUser->save();

                    $this->info('  ✓ password restored: '.$dbUser->email);
                }

                continue;
            }

            $model = new User;

            $model->name = (string) ($user['name'] ?? $email);

            $model->email = $email;

            $model->password = $password ?? Hash::make(Str::random(32));

            $model->must_change_password = $password === null;

            $model->role_id = $this->resolveRoleId($user['role'] ?? null);

            $model->save();

            $created++;

            $this->info('  + created user '.$email.' from v5 export');
        }

        $this->info('User sync done ('.$created.' created).');
    }

    /**
     * Return the v5 password hash, or null when the user had no password.
     */
    private function passwordHash(array $user): ?string
    {
        if (! ($user['has_password'] ?? false)) {
            return null;
        }

        $password = (string) ($user['password'] ?? '');

        if ($password === '') {
            return null;
        }

        if (str_starts_with($password, '$')) {
            return $password;
        }

        return Hash::make($password);
    }

    private function resolveRoleId(?string $slug): ?int
    {
        if ($slug === null || $slug === '') {
            return null;
        }

        return Role::where('slug', $slug)->value('id');
    }

    /**
     * Recursively rewrite every V7 absolute image URL inside a layout to the
     * final relative route, so no old host or /v5/ prefix leaks into payloads.
     */
    private function rewriteImageUrls(mixed $node): mixed
    {
        if (is_array($node)) {
            $out = [];

            foreach ($node as $key => $value) {
                $out[$key] = $this->rewriteImageUrls($value);
            }

            return $out;
        }

        if (is_string($node)) {
            $rewritten = preg_replace(
                '#https?://[^"\'\\s]*?/api/v5/builder-pages/(\d+)/images/([a-zA-Z0-9_.-]+)#i',
                '/api/builder-pages/$1/images/$2',
                $node
            );

            return $rewritten ?? $node;
        }

        return $node;
    }

    /**
     * Remap a v5 owner_user_id to the final users table via v5 email.
     */
    private function ownerId(mixed $v5Id, array $userByV5Id): ?int
    {
        if ($v5Id === null || $v5Id === '') {
            return null;
        }

        return $userByV5Id[(int) $v5Id] ?? null;
    }

    /**
     * Verify the image binaries referenced by the layouts exist in the public disk.
     * The target folder is the page id *embedded in the URL* (V7 duplicates keep
     * pointing at the original page), not necessarily the importing page id.
     *
     * @param array<int, array{0: string, 1: int}> $refs each [url, importing page id]
     */
    private function verifyImageFiles(array $refs): void
    {
        $seen = [];

        foreach ($refs as [$url]) {
            if (! preg_match('#/api/v5/builder-pages/(\d+)/images/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)$#i', (string) $url, $m)) {
                if (! preg_match('#builder-pages/(\d+)/images/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)$#i', (string) $url, $m)) {
                    continue;
                }
            }

            $pageId = $m[1];

            $filename = $m[2];

            $target = "builder-images/{$pageId}/{$filename}";

            $key = md5($target);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;

            if (Storage::disk('public')->exists($target)) {
                $this->info('  ✓ image present: '.$target);

                continue;
            }

            $this->warn('  ✗ image MISSING: '.$target.' (referenced from a page layout)');
        }
    }

    private function parseDate(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }

    private function parseInt(?string $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }
}