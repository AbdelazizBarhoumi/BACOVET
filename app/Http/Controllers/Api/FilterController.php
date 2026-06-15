<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FilterController extends Controller
{
    public function options(): JsonResponse
    {
        // Marque — from quantite_par_famille (exclude null rollup)
        $marques = DB::table('quantite_par_famille')
            ->whereNotNull('famille_fg')
            ->where('famille_fg', '!=', '')
            ->distinct()
            ->pluck('famille_fg')
            ->sort()
            ->values();

        // Ligne — from wip_chaine
        $lignes = DB::table('wip_chaine')
            ->whereNotNull('chaine')
            ->where('chaine', '!=', '')
            ->distinct()
            ->pluck('chaine')
            ->sort()
            ->values();

        // OF — from etat_avancement (active OFs)
        $ofs = DB::table('etat_avancement')
            ->whereNotNull('of')
            ->where('of', '!=', '')
            ->distinct()
            ->pluck('of')
            ->sort()
            ->values();

        return response()->json([
            'marques' => $marques,
            'ateliers' => ['Confection', 'Coupe', 'Sérigraphie'],
            'lignes' => $lignes,
            'ofs' => $ofs,
        ]);
    }
}
