import type { EmbodiedRegion, UnrealCommand, WorldEmbodimentDelta, WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"

// Sprint 8, Phase 12/17: the headless, Unreal-COMPATIBLE adapter. No
// Unreal dependency exists anywhere in this file -- it is pure data
// translation from WorldEmbodimentSnapshot into the generic UnrealCommand
// vocabulary, provable and testable without installing an engine. This
// is the proof that the SAME semantic world truth a Web adapter renders
// is ALSO representable for a spatial engine -- one Living World, two
// possible embodiments, never two separate worlds.
function regionToCommands(region: EmbodiedRegion): UnrealCommand[] {
  const commands: UnrealCommand[] = [
    { op: "CreateRegion", regionId: region.locationId, name: region.name, transform: region.spatialNode.transform, bounds: region.spatialNode.bounds },
    { op: "UpdateEnvironment", regionId: region.locationId, atmosphere: region.environment.atmosphere, water: region.environment.water, vegetation: region.environment.vegetation },
  ]
  for (const entity of region.entities) {
    commands.push({ op: "PlaceEntity", entityId: entity.entityId, regionId: region.locationId, presentationArchetype: entity.presentationArchetype, animationSemantic: entity.animationSemantic })
  }
  for (const encounter of region.encounters) {
    commands.push({ op: "CreateInteractionAnchor", regionId: region.locationId, ruleId: encounter.ruleId, category: encounter.category, interactionAffordance: encounter.interactionAffordance })
  }
  return commands
}

export function translateToUnrealCommands(snapshot: WorldEmbodimentSnapshot): UnrealCommand[] {
  return [regionToCommands(snapshot.current), ...snapshot.reachable.map(regionToCommands)].flat()
}

// Delta-driven translation: only the entries an EmbodimentDelta actually
// names produce a command, proving Phase 13's reconciliation model feeds
// a renderer that never rebuilds the whole world -- an UNCHANGED entry
// produces no command at all.
export function translateEmbodimentDeltaToUnrealCommands(delta: WorldEmbodimentDelta): UnrealCommand[] {
  const commands: UnrealCommand[] = []
  for (const entry of delta.entries) {
    const [kind, key] = entry.path.split(":")
    if (entry.op === "UNCHANGED") continue

    if (kind === "entity") {
      if (entry.op === "REMOVE") commands.push({ op: "RemoveEntity", entityId: key })
      else {
        const after = entry.after as { entityId: string; locationId: string; presentationArchetype: string; animationSemantic: string; activityHint: string }
        commands.push(
          entry.op === "ADD"
            ? { op: "PlaceEntity", entityId: after.entityId, regionId: after.locationId, presentationArchetype: after.presentationArchetype, animationSemantic: after.animationSemantic }
            : { op: "UpdateEntity", entityId: after.entityId, animationSemantic: after.animationSemantic, activityHint: after.activityHint },
        )
      }
    } else if (kind === "region" && entry.path.endsWith(".environment")) {
      const regionId = key.replace(/\.environment$/, "")
      if (entry.op !== "REMOVE") {
        const after = entry.after as { atmosphere: { semantic: string; illuminationSemantic: string }; water: { semantic: string; levelBand: never }; vegetation: { semantic: string; densityBand: never } }
        commands.push({ op: "SetAtmosphere", regionId, semantic: after.atmosphere.semantic, illuminationSemantic: after.atmosphere.illuminationSemantic })
        commands.push({ op: "SetWaterState", regionId, semantic: after.water.semantic, levelBand: after.water.levelBand })
        commands.push({ op: "SetVegetationIntent", regionId, semantic: after.vegetation.semantic, densityBand: after.vegetation.densityBand })
      }
    } else if (kind === "encounter") {
      if (entry.op === "ADD") {
        const after = entry.after as { ruleId: string; locationId: string; category: never; interactionAffordance: string }
        commands.push({ op: "CreateInteractionAnchor", regionId: after.locationId, ruleId: after.ruleId, category: after.category, interactionAffordance: after.interactionAffordance })
      }
      // REMOVE for an encounter has no dedicated Unreal command in this
      // minimal vocabulary -- an interaction anchor disappearing is
      // presentation-only cleanup, not something the reference
      // translator needs a distinct op for this sprint.
    }
  }
  return commands
}
