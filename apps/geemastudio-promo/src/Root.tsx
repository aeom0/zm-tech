import { Composition, Folder } from 'remotion'
import { REEL } from './brand'
import { ReelWhatsApp, reelFrames, SCENE_S } from './ReelWhatsApp'
import { AgendaScene } from './scenes/AgendaScene'
import { CtaScene } from './scenes/CtaScene'
import { FinanzasScene } from './scenes/FinanzasScene'
import { HookScene } from './scenes/HookScene'
import { WhatsAppScene, whatsAppSceneFrames } from './scenes/WhatsAppScene'

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ReelWhatsApp"
        component={ReelWhatsApp}
        durationInFrames={reelFrames(REEL.fps)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Folder name="ReelWhatsApp-Escenas">
        <Composition id="Gancho" component={HookScene} durationInFrames={SCENE_S.gancho * REEL.fps} fps={30} width={1080} height={1920} />
        <Composition
          id="WhatsApp"
          component={WhatsAppScene}
          durationInFrames={whatsAppSceneFrames(REEL.fps)}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition id="Agenda" component={AgendaScene} durationInFrames={SCENE_S.agenda * REEL.fps} fps={30} width={1080} height={1920} />
        <Composition id="Finanzas" component={FinanzasScene} durationInFrames={SCENE_S.finanzas * REEL.fps} fps={30} width={1080} height={1920} />
        <Composition id="Cierre" component={CtaScene} durationInFrames={SCENE_S.cierre * REEL.fps} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  )
}
