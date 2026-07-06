// Baum-Logik für die unbegrenzt tief verschachtelten Schritte.
// Der ganze Baum eines Ziels wird geladen (persönliches Tool, kleine
// Datenmengen) — "Braucht Klärung" & Co. werden client-seitig berechnet.

export function buildTree(steps) {
  const byId = new Map(steps.map((s) => [s.id, { ...s, children: [] }]))
  const roots = []
  for (const node of byId.values()) {
    if (node.parent_step_id && byId.has(node.parent_step_id)) {
      byId.get(node.parent_step_id).children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (nodes) => {
    nodes.sort(
      (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    )
    nodes.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return { roots, byId }
}

// Gibt es im Unterbaum (inkl. des Knotens selbst, falls er ein Blatt ist)
// einen offenen, kindlosen Schritt = eine konkrete nächste Handlung?
export function hasOpenLeaf(node) {
  if (node.children.length === 0) return !node.is_done
  return node.children.some(hasOpenLeaf)
}

// "Braucht Klärung": offen UND keine konkrete nächste Handlung im Unterbaum
export function stepNeedsClarification(node) {
  return !node.is_done && !hasOpenLeaf(node)
}

// Ziel-Ebene: aktives Ziel ohne einen einzigen offenen Blatt-Schritt
// (ein Ziel ganz ohne Schritte braucht ebenfalls Klärung)
export function goalNeedsClarification(roots) {
  return !roots.some(hasOpenLeaf)
}

export function countSteps(nodes) {
  let total = 0
  let done = 0
  const walk = (list) => {
    for (const n of list) {
      total += 1
      if (n.is_done) done += 1
      walk(n.children)
    }
  }
  walk(nodes)
  return { total, done }
}

// Erster offener Blatt-Schritt in DFS-Reihenfolge — das ist der
// "Nächste Schritt" (konkrete, nicht weiter unterteilte Handlung)
export function firstOpenLeaf(nodes) {
  for (const n of nodes) {
    if (n.children.length === 0) {
      if (!n.is_done) return n
    } else {
      const found = firstOpenLeaf(n.children)
      if (found) return found
    }
  }
  return null
}

// Pfad vom Root bis zum Schritt (für Breadcrumbs), Schritt selbst inklusive
export function pathToStep(byId, stepId) {
  const path = []
  let current = byId.get(stepId)
  while (current) {
    path.unshift(current)
    current = current.parent_step_id ? byId.get(current.parent_step_id) : null
  }
  return path
}
