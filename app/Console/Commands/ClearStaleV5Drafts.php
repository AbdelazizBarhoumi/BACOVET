<?php

namespace App\Console\Commands;

use App\Models\BuilderPageV5;
use Illuminate\Console\Command;

class ClearStaleV5Drafts extends Command
{
    protected $signature = 'v5:clear-stale-drafts
        {--all : Clear every draft, ignoring the committed-layout comparison}
        {--dry-run : Report what would be cleared without writing}';

    protected $description = 'Clear v5 layout drafts that duplicate the committed layout (created by the phantom-dirty autosave bug)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $all = (bool) $this->option('all');

        $pages = BuilderPageV5::whereNotNull('layout_draft')->get();

        if ($pages->isEmpty()) {
            $this->info('No pages have a draft — nothing to do.');

            return self::SUCCESS;
        }

        $cleared = 0;

        foreach ($pages as $page) {
            if (! $all && ! $this->samePayload($page->layout, $page->layout_draft)) {
                continue;
            }

            $cleared++;

            $this->line(sprintf(
                '  %s %s (%s)',
                $all ? 'clear' : 'stale',
                $page->id,
                $page->slug
            ));

            if ($dryRun) {
                continue;
            }

            $page->layout_draft = null;
            $page->layout_draft_updated_at = null;
            $page->save();
        }

        $verb = $dryRun ? 'Would clear' : 'Cleared';

        $this->info(sprintf('%s %d stale draft(s).', $verb, $cleared));

        return self::SUCCESS;
    }

    /**
     * Whether two layout payloads are equivalent regardless of key order.
     */
    private function samePayload(mixed $a, mixed $b): bool
    {
        return json_encode($this->canonicalize($a)) === json_encode($this->canonicalize($b));
    }

    private function canonicalize(mixed $value): mixed
    {
        if (is_array($value)) {
            $out = [];

            foreach ($value as $key => $item) {
                $out[$key] = $this->canonicalize($item);
            }

            if (array_is_list($out)) {
                return $out;
            }

            ksort($out);

            return $out;
        }

        return $value;
    }
}
