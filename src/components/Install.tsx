import { useEffect, useState, useSyncExternalStore } from 'react'
import { canPrompt, isIOS, isStandalone, promptInstall, subscribe } from '@/lib/install'
import { DICT } from '@/lib/i18n'
import type { Lang } from '@/lib/phv'

/** Botó "Instal·la l'app": diàleg natiu a Android/ordinador, instruccions a iPhone. */
export function InstallButton({ lang, compact }: { lang: Lang; compact?: boolean }) {
  const t = DICT[lang]
  const available = useSyncExternalStore(subscribe, canPrompt)
  const [standalone, setStandalone] = useState(isStandalone)
  const [help, setHelp] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const on = () => setStandalone(isStandalone())
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  if (standalone || (!available && !isIOS())) return null
  const click = async () => { if (available) await promptInstall(); else setHelp(true) }
  return (
    <>
      <button className={compact ? 'btn-ghost text-[13px] px-3 py-1.5 no-print' : 'btn no-print'} onClick={click}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg>
        {t.install}
      </button>
      {help && (
        <div className="sheet-bg" role="dialog" aria-modal="true" aria-labelledby="ios-h" onClick={() => setHelp(false)}>
          <div className="sheet grid gap-4" onClick={(e) => e.stopPropagation()}>
            <h2 id="ios-h" className="font-display text-[20px] font-bold">{t.install_ios_title}</h2>
            <ol className="grid gap-3 text-[15px]">
              <li className="flex gap-3 items-start"><b className="font-mono">1</b><span>{t.install_ios_1} <svg className="inline -mt-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4M5 11v9h14v-9" /></svg></span></li>
              <li className="flex gap-3 items-start"><b className="font-mono">2</b><span>{t.install_ios_2}</span></li>
              <li className="flex gap-3 items-start"><b className="font-mono">3</b><span>{t.install_ios_3}</span></li>
            </ol>
            <p className="text-[13px] muted">{t.install_ios_note}</p>
            <button className="btn justify-center" onClick={() => setHelp(false)}>{t.understood}</button>
          </div>
        </div>
      )}
    </>
  )
}
