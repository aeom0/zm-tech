'use client'

import { useHaikuConfig } from '@/hooks/waba/useHaikuConfig'
import { DEFAULT_HAIKU_SYSTEM_PROMPT_GUIDE } from './_lib/defaultHaikuConfig'
import { SystemPromptEditor } from './_components/SystemPromptEditor'
import { TriggerKeywordsEditor } from './_components/TriggerKeywordsEditor'
import { WelcomeGreetingEditor } from './_components/WelcomeGreetingEditor'
import { BlockedNumbersEditor } from './_components/BlockedNumbersEditor'
import { HaikuTestPanel } from './_components/HaikuTestPanel'

export default function PanelWabaHaikuPage() {
  const { query, saveSystemPrompt, saveTriggerKeywords, saveSettings, saveBlockedPhones } = useHaikuConfig()

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-zinc-500">WhatsApp</div>
        <h1 className="text-2xl font-bold text-white">Asistente IA</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configuración completa del bot Haiku: personalidad, keywords de activación, saludo de
          bienvenida y números bloqueados.
        </p>
      </div>

      {query.isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {query.error instanceof Error ? query.error.message : 'Error al cargar la configuración'}
        </div>
      )}

      {query.isLoading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando configuración…
        </div>
      )}

      {!query.isLoading && !query.isError && query.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <SystemPromptEditor
              value={query.data.systemPrompt}
              defaultValue={DEFAULT_HAIKU_SYSTEM_PROMPT_GUIDE}
              onSave={saveSystemPrompt}
            />
            <TriggerKeywordsEditor value={query.data.triggerKeywords} onSave={saveTriggerKeywords} />
            <WelcomeGreetingEditor value={query.data.settings} onSave={saveSettings} />
            <BlockedNumbersEditor value={query.data.blockedPhones} onSave={saveBlockedPhones} />
          </div>

          <div>
            <HaikuTestPanel systemPrompt={query.data.systemPrompt} settings={query.data.settings} />
          </div>
        </div>
      )}
    </div>
  )
}
