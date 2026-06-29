import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, ReqLabel } from "@/components/v1/primitives";
import { ComboChart, GaugeChart, LineChart, AreaChart, TimelineChart, HBarChart, SparkCanvas } from "@/components/v1/canvas-charts";
export default function Page() {
  return (
    <>
      <PageHeader
        title="PERFORMANCE DE PRODUCTION & FLUX (SÉRIE 200)"
        subtitle="CHAÎNE DE PRODUCTION N°1 – CONFECTION TEXTILE"
        filters={<>
          <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          <FilterPill label="Ligne" value="Ligne 1 - Série 200" icon={Filters.Layers} />
          <FilterPill label="Atelier" value="Confection" icon={Filters.Factory} />
          <FilterPill label="Shift" value="Jour 07:00 - 19:00" icon={Filters.Users} />
        </>}
      />
      <div className="p-3 space-y-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: '1.2fr repeat(5, 1fr)' }}>
          <Card className="rounded-sm relative overflow-hidden">
            <ReqLabel id="F-REQ-204" title="OWE (Overall Work Efficiency) par chaîne" />
            <div className="text-3xl font-black text-[var(--status-green)]">72,4 %</div>
            <div>Objectif : &gt; 70 %</div>
            <SparkCanvas />
          </Card>
          <Card className="rounded-sm relative overflow-hidden !bg-[#2a46bd]/15 !border-[#2a46bd]/30 flex flex-col">
            <ReqLabel id="F-REQ-211" title="SAM (Temps standard alloué) par chaîne" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">8 450 <span className="text-lg font-normal text-muted-foreground">min</span></div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#2a46bd" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#822abd]/15 !border-[#822abd]/30 flex flex-col">
            <ReqLabel id="F-REQ-212" title="SOT (Temps article fournisseur)" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">2 180 <span className="text-lg font-normal text-muted-foreground">min</span></div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 64 64">
                <path d="M0 0h64v64H0z" fill="none" />
                <path fill="#822abd" d="m50.332 22.833l1.264-1.254l.984.976l2.976-2.952a1.495 1.495 0 0 0 0-2.125l-2.679-2.656a1.52 1.52 0 0 0-2.141 0l-2.977 2.952l.984.976l-1.264 1.253a24 24 0 0 0-14.053-5.576v-1.182c2.488-.631 4.332-2.864 4.332-5.53C37.76 4.558 35.181 2 32 2s-5.761 2.558-5.761 5.714c0 2.667 1.843 4.898 4.332 5.53v1.182a24 24 0 0 0-14.053 5.577l-1.264-1.254l.982-.976l-2.976-2.952a1.523 1.523 0 0 0-2.141 0l-2.678 2.656a1.494 1.494 0 0 0 0 2.125l2.977 2.954l.983-.977l1.263 1.254C10.134 26.98 8 32.337 8 38.19C8 51.342 18.746 62 32 62s24-10.658 24-23.81c0-5.853-2.135-11.211-5.668-15.357M29.586 6.712v4.294a4.05 4.05 0 0 1-1.701-3.292c0-2.254 1.843-4.081 4.115-4.081c2.271 0 4.113 1.827 4.113 4.081c0 1.357-.674 2.55-1.701 3.292l.001-4.294c0-1.455-4.826-1.455-4.827 0M32 58.826c-11.487 0-20.8-9.238-20.8-20.636c0-11.396 9.313-20.634 20.8-20.634s20.799 9.239 20.799 20.634c0 11.398-9.313 20.636-20.799 20.636" />
                <path fill="#822abd" d="M32 19.143v1.588h-.677v5.372H32v9.4c-1.496 0-2.709 1.202-2.709 2.687s1.213 2.688 2.709 2.688c.316 0 .617-.064.9-.164l10.122 8.307l-.001-.002l2.619 2.575c3.437-3.441 5.559-8.177 5.559-13.404c0-10.518-8.596-19.047-19.199-19.047m13.553 29.685l-10.848-10.66a2.67 2.67 0 0 0-.785-1.871V21.153c2.189.241 4.256.894 6.123 1.873l-1.185 2.035l1.172.671l1.185-2.032a17.3 17.3 0 0 1 5.39 5.35l-2.047 1.173l.677 1.163l2.045-1.169a16.9 16.9 0 0 1 1.969 7.306h-5.064v1.34h5.067a16.9 16.9 0 0 1-1.962 7.313l-2.055-1.178l-.677 1.163l2.051 1.176c-.328.51-.672 1.012-1.056 1.491m-14.23 1.451h1.353v5.372h-1.353zM14.399 37.521h5.416v1.34h-5.416zm8.214-14.115l1.354 2.325l1.173-.671l-1.354-2.325zm-3.172 6.816l-2.345-1.343l-.677 1.164l2.345 1.344zM16.419 46.34l.677 1.164l2.345-1.345l-.677-1.163zm6.193 6.637l1.173.671l1.354-2.327l-1.172-.672zm16.247-1.656l1.354 2.327l1.174-.671l-1.356-2.328z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#6685f6]/15 !border-[#6685f6]/30 flex flex-col">
            <ReqLabel id="F-REQ-213" title="Effectif par chaîne" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">132</div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 512 512">
                <path d="M0 0h512v512H0z" fill="none" />
                <circle cx="152" cy="184" r="72" fill="#6685f6" />
                <path fill="#6685f6" d="M234 296c-28.16-14.3-59.24-20-82-20c-44.58 0-136 27.34-136 82v42h150v-16.07c0-19 8-38.05 22-53.93c11.17-12.68 26.81-24.45 46-34" />
                <path fill="#6685f6" d="M340 288c-52.07 0-156 32.16-156 96v48h312v-48c0-63.84-103.93-96-156-96" />
                <circle cx="340" cy="168" r="88" fill="#6685f6" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#40ced2]/15 !border-[#40ced2]/30 flex flex-col">
            <ReqLabel id="F-REQ-214" title="Code article par chaîne" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-2xl font-black text-foreground">ART-200-45</div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#40ced2" fill-rule="evenodd" d="M3.207 14.207a1 1 0 0 1 0-1.414l9.5-9.5A1 1 0 0 1 13.414 3H20a1 1 0 0 1 1 1v6.586a1 1 0 0 1-.293.707l-9.5 9.5a1 1 0 0 1-1.414 0zM16 10a2 2 0 1 0 0-4a2 2 0 0 0 0 4" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#03ce06]/15 !border-[#03ce06]/30 flex flex-col">
            <ReqLabel id="F-REQ-215" title="Désignation d'article" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-xl font-black text-foreground">T-SHIRT SNAP</div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 640 640">
                <path d="M0 0h640v640H0z" fill="none" />
                <path fill="#03ce06" d="M320.2 176c44.2 0 80-35.8 80-80h53.5c17 0 33.3 6.7 45.3 18.7l118.6 118.7c12.5 12.5 12.5 32.8 0 45.3l-50.7 50.7c-12.5 12.5-32.8 12.5-45.3 0L480.2 288v224c0 35.3-28.7 64-64 64h-192c-35.3 0-64-28.7-64-64V288l-41.4 41.4c-12.5 12.5-32.8 12.5-45.3 0l-50.6-50.8c-12.5-12.5-12.5-32.8 0-45.3l118.6-118.6c12-12 28.3-18.7 45.3-18.7h53.5c0 44.2 35.8 80 80 80z" />
              </svg>
            </div>
          </Card>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1.4fr 15% 1.05fr 15%' }}>
          <Card className="rounded-sm tall">
            <ReqLabel id="F-REQ-201" title="Efficience par opérateur par chaîne" />
            <ComboChart values={[94.2, 91.1, 89.7, 92.5, 87.4, 93.2, 90.5, 88.9]} target={90} />
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-202" title="Efficience par chaîne" />
            <GaugeChart value={89.6} target="> 85 %" />
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-203" title="Efficience cumulée par chaîne" />
            <LineChart values={[78.2, 81.6, 83.7, 85.4, 87.3, 89.6]} target={85} />
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-205" title="WIP par chaîne" />
            <GaugeChart value={42} target="≤ 1/2 cadence" color="orange" />
          </Card>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-206" title="WIP Optimal" />
            <AreaChart values={[1050, 1230, 1410, 1560, 1680, 1820]} />
          </Card>
         <Card className="rounded-sm">
  <ReqLabel id="F-REQ-207" title="Arrêts non planifiés par chaîne (Lost Time)" />
  <TimelineChart points={[
    { time: '08:35', min: 4 },
    { time: '09:50', min: 6 },
    { time: '11:20', min: 3 },
    { time: '13:15', min: 5 },
    { time: '15:40', min: 2 },
  ]} />
  <table className="w-full border-collapse text-[10.5px]">
    <thead>
      <tr className="text-muted-foreground bg-muted/50">
        <th className="border-b border-border px-2 text-left">Heure début</th>
        <th className="border-b border-border px-2 text-left">Durée</th>
        <th className="border-b border-border px-2 text-left">Cause</th>
        <th className="border-b border-border px-2 text-left">Impact</th>
        <th className="border-b border-border px-2 text-left">Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="border-b border-border px-2">08:35</td>
        <td className="border-b border-border px-2">4 min</td>
        <td className="border-b border-border px-2">Réglage machine</td>
        <td className="border-b border-border px-2 text-green-500">Faible</td>
        <td className="border-b border-border px-2 text-green-500">Résolu</td>
      </tr>
      <tr>
        <td className="border-b border-border px-2">09:50</td>
        <td className="border-b border-border px-2">6 min</td>
        <td className="border-b border-border px-2">Manque matière</td>
        <td className="border-b border-border px-2 text-orange-500">Moyen</td>
        <td className="border-b border-border px-2 text-green-500">Résolu</td>
      </tr>
      <tr>
        <td className="border-b border-border px-2">11:20</td>
        <td className="border-b border-border px-2">3 min</td>
        <td className="border-b border-border px-2">Problème électrique</td>
        <td className="border-b border-border px-2 text-green-500">Faible</td>
        <td className="border-b border-border px-2 text-green-500">Résolu</td>
      </tr>
      <tr>
        <td className="border-b border-border px-2">13:15</td>
        <td className="border-b border-border px-2">5 min</td>
        <td className="border-b border-border px-2">Changement modèle</td>
        <td className="border-b border-border px-2 text-orange-500">Moyen</td>
        <td className="border-b border-border px-2 text-green-500">Résolu</td>
      </tr>
      <tr>
        <td className="border-b border-border px-2">15:40</td>
        <td className="border-b border-border py-1.5 px-2">2 min</td>
        <td className="border-b border-border py-1.5 px-2">Autre</td>
        <td className="border-b border-border py-1.5 px-2 text-green-500">Faible</td>
        <td className="border-b border-border py-1.5 px-2 text-green-500">Résolu</td>
      </tr>
    </tbody>
  </table>
</Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-208" title="Efficience Départage par opératrice" />
            <ComboChart values={[92.1, 90.3, 88.6, 91.7, 87.9, 93.0]} target={85} />
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-209" title="Efficience Vignettes par opératrice" />
            <ComboChart values={[93.5, 90.8, 88.9, 92.4, 87.2, 93.6]} target={85} />
          </Card>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1.5fr repeat(2, 15%) repeat(2, 1fr)' }}>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-210" title="Top opérateurs coupe" />
            <HBarChart names={['OP12', 'OP07', 'OP03', 'OP01', 'OP09']} values={[96.2, 94.8, 93.1, 91.4, 90.3]} target={90} />
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-216" title="Taux d'archivage des OF" />
            <GaugeChart value={86.7} target="85 %" color="orange" />
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-217" title="Taux de fiabilité des données par OF" />
            <GaugeChart value={95.3} target="95 %" />
          </Card>
          <Card className="rounded-sm flex flex-col overflow-hidden">
            <ReqLabel id="F-REQ-218" title="Taux de respect du temps estimé par article" />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-[var(--status-green)]">91,2 %</div>
              <div className="text-xs text-muted-foreground mt-1">Objectif : 90 %</div>
            </div>
            <SparkCanvas fullWidth />
          </Card>
          <Card className="rounded-sm flex flex-col overflow-hidden">
            <ReqLabel id="F-REQ-219" title="Taux des temps acceptés dès la première version" />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-[var(--status-green)]">82,6 %</div>
              <div className="text-xs text-muted-foreground mt-1">Objectif : ≥ 80 %</div>
            </div>
            <SparkCanvas fullWidth />
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}
