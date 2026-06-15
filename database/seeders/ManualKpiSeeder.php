<?php

namespace Database\Seeders;

use App\Models\ManualKpiValue;
use Illuminate\Database\Seeder;

class ManualKpiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $keys = [
            // Méthodes
            ['kpi_key' => 'f_req_218', 'kpi_label' => 'Respect Temps Estimé'],
            ['kpi_key' => 'f_req_219', 'kpi_label' => 'Temps Acceptés 1ère Version'],
            // Development (Série 350 — F-REQ-350 à 353 uniquement)
            ['kpi_key' => 'dev_rft',          'kpi_label' => 'RFT Développement'],
            ['kpi_key' => 'dev_livraison',    'kpi_label' => 'Respect Livraison à Date'],
            ['kpi_key' => 'dev_nomenclature', 'kpi_label' => 'Fiabilité Nomenclature'],
            ['kpi_key' => 'dev_reclamations', 'kpi_label' => '% Réclamations Production'],
        ];

        foreach ($keys as $kpi) {
            ManualKpiValue::updateOrCreate(['kpi_key' => $kpi['kpi_key']], $kpi);
        }
    }
}
