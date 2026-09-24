"""End-to-end UI test: drives the real editor in Chromium (Playwright).

Run:  python3 tests/ui/test_ui.py   (needs: pip install playwright; playwright install chromium)
"""
import asyncio, os, sys, subprocess, json
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
APP = "file://" + os.path.join(ROOT, "app", "index.html")
FIX = os.path.join(ROOT, "ExampleConfigs")
OUT = os.environ.get("UI_OUT", os.path.join(ROOT, "tests", "ui", "out"))
os.makedirs(OUT, exist_ok=True)
results = []

PRETTY = """(level) => {
  const BE = window.BatchEditor, s = BE.app.state, doc = s.doc;
  const tree = s.trees[level];
  const pr = (seq) => seq.map((it) => {
    if (it.kind === 'step') return doc.name(doc.re(it.reId));
    if (it.kind === 'transition') return 'T';
    if (it.kind === 'loop') return 'LOOP{' + pr(it.body) + '}';
    if (it.kind === 'parallel') return '||[' + it.lanes.map(pr).join(' | ') + ']';
  }).join(', ');
  return pr(tree.seq);
}"""

def check(cond, msg):
    results.append((bool(cond), msg))
    print(("  ok   " if cond else "  FAIL ") + msg)

async def pretty(pg, level="ph"):
    return await pg.evaluate(PRETTY, level)

async def card(pg, lane, name, nth=0):
    return pg.locator(f"#{lane} .node.step", has=pg.locator(".n-name", has_text=name)).nth(nth)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1600, "height": 1000}, accept_downloads=True)
        pg = await ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(APP)

        # ---- load & view
        await pg.set_input_files("#fileInput", os.path.join(FIX, "Move_2.xml"))
        await pg.wait_for_selector("#lanePH .node")
        start = await pretty(pg)
        check(start.startswith("mixerOn, mixerOff, setTempLimit, T, LOOP{feedCipWater}, ||[coolingOn, circulatePump"), "Move_2 loads: " + start)
        await pg.click("#btnEdit")

        # ---- Move2b by drag and drop: circulatePump -> slot before first fork
        src = await card(pg, "lanePH", "circulatePump")
        target = pg.locator('#lanePH .slot[data-seq="top"][data-index="5"]')
        await src.drag_to(target)
        await pg.wait_for_timeout(200)
        got = await pretty(pg)
        check(got.startswith("mixerOn, mixerOff, setTempLimit, T, LOOP{feedCipWater}, circulatePump, ||[coolingOn | coolingOff, circulateMaxShea]"), "drag Move2b: " + got)
        await pg.screenshot(path=os.path.join(OUT, "01_after_move2b.png"))

        # ---- undo / redo with keyboard
        await pg.keyboard.press("Control+z")
        check((await pretty(pg)) == start, "Ctrl+Z restores")
        await pg.keyboard.press("Control+y")
        check((await pretty(pg)) == got, "Ctrl+Y redoes")

        # ---- add a process phase through the + slot and the picker
        slot = pg.locator('#lanePH .slot[data-seq="top"][data-index="0"]')
        await slot.hover()
        await slot.locator(".slot-add").click()
        await pg.click("#popover .menu-item:has-text('Process phase')")
        await pg.fill("#popover .picker-search", "coolingOn")
        await pg.screenshot(path=os.path.join(OUT, "02_picker.png"))
        await pg.click("#popover .menu-item:has-text('coolingOn')")
        got2 = await pretty(pg)
        check(got2.startswith("coolingOn, mixerOn"), "insert phase at top: " + got2)

        # ---- properties: edit a parameter value (Formula-backed)
        await (await card(pg, "lanePH", "coolingOn")).click()
        await pg.wait_for_selector("#props:not([hidden])")
        inp = pg.locator('#propsBody input[data-bind$=":setpointTemp"]')
        await inp.fill("42.5")
        await inp.press("Tab")
        val = await pg.evaluate("""() => { const s = BatchEditor.app.state, d = s.doc;
            const it = BatchEditor.sfc.findByKey(s.trees.ph, s.sel.key);
            return d.phaseParams(d.re(it.reId)).find(p => p.name === 'setpointTemp').value; }""")
        check(val == "42.5", "parameter edit stored in Formula: " + str(val))
        await pg.screenshot(path=os.path.join(OUT, "03_properties.png"))
        await pg.click("#props .x")

        # ---- add a transition after mixerOn and set its condition
        slot = pg.locator('#lanePH .slot[data-seq="top"][data-index="2"]')
        await slot.hover()
        await slot.locator(".slot-add").click()
        await pg.click("#popover .menu-item:has-text('Transition')")
        cond = pg.locator('#propsBody textarea[data-bind$=":condition"]')
        await cond.fill('Ask("Ready?")')
        await cond.press("Tab")
        got3 = await pretty(pg)
        check(got3.startswith("coolingOn, mixerOn, T, mixerOff"), "insert transition: " + got3)
        tc = await pg.locator("#lanePH .node.trans .t-cond", has_text="Ask").count()
        check(tc == 1, "transition shows its condition")
        await pg.click("#props .x")

        # ---- branch lane menu: add lane, delete lane
        par = pg.locator("#lanePH .par").first
        await par.locator(".par-bar.fork .kebab").click()
        await pg.click("#popover .menu-item:has-text('Add lane')")
        lanes = await pg.locator("#lanePH .par").first.locator(":scope > .par-lanes > .lane-col").count()
        check(lanes == 3, "add lane -> 3 lanes")
        await pg.locator("#lanePH .par").first.locator(":scope > .par-lanes > .lane-col").nth(2).locator(".lane-head .kebab").click()
        await pg.click("#popover .menu-item:has-text('Delete this lane')")
        lanes = await pg.locator("#lanePH .par").first.locator(":scope > .par-lanes > .lane-col").count()
        check(lanes == 2, "delete empty lane -> 2 lanes")

        # ---- delete a phase via its menu
        await (await card(pg, "lanePH", "coolingOn")).locator(".kebab").click()
        await pg.click("#popover .menu-item.danger:has-text('Delete')")
        check(not (await pretty(pg)).startswith("coolingOn"), "delete phase")

        # ---- operations lane: add an operation after UP, then move a phase to it by drag onto the card
        slot = pg.locator('#laneOP .slot[data-seq="top"][data-index="1"]')
        await slot.hover()
        await slot.locator(".slot-add").click()
        await pg.click("#popover .menu-item:has-text('Operation')")
        await pg.fill("#dName", "Cleaning")
        await pg.click("#modalOk")
        ops = await pretty(pg, "op")
        check(ops == "UP, Cleaning", "add operation: " + ops)
        check((await pretty(pg, "ph")) == "", "new operation selected and empty")
        # empty operation: + in the empty route, add a phase
        await pg.locator('#lanePH .slot[data-index="0"] .slot-add').first.click(force=True)
        await pg.click("#popover .menu-item:has-text('Process phase')")
        await pg.click("#popover .menu-item:has-text('feedPWater')")
        check((await pretty(pg, "ph")) == "feedPWater", "first phase in new operation")
        # back to UP operation, drag mixerOn onto the Cleaning card
        await (await card(pg, "laneOP", "UP")).click()
        await (await card(pg, "lanePH", "mixerOn")).drag_to(await card(pg, "laneOP", "Cleaning"))
        await (await card(pg, "laneOP", "Cleaning")).click()
        check((await pretty(pg, "ph")) == "feedPWater, mixerOn", "drag phase onto another operation: " + await pretty(pg, "ph"))

        # ---- cut & paste: move feedPWater back into UP operation's loop body
        await (await card(pg, "lanePH", "feedPWater")).locator(".kebab").click()
        await pg.click("#popover .menu-item:has-text('Move')")
        check(await pg.locator("#cutBanner:not([hidden])").count() == 1, "move banner shown")
        await (await card(pg, "laneOP", "UP")).click()
        loop_uid = await pg.evaluate("() => BatchEditor.app.state.trees.ph.seq.find(i => i.kind === 'loop').uid")
        await pg.click(f'#lanePH .slot[data-seq="{loop_uid}:body"][data-index="1"]')
        got4 = await pretty(pg)
        check("LOOP{feedCipWater, feedPWater}" in got4, "cut/paste into loop body across operations: " + got4)

        # ---- loop menu: remove loop keeps body
        await pg.locator("#lanePH .loop .loop-head .kebab").first.click()
        await pg.click("#popover .menu-item:has-text('Remove loop')")
        got5 = await pretty(pg)
        check("LOOP" not in got5 and "feedCipWater, feedPWater" in got5, "remove loop keeps contents: " + got5)

        # ---- unit procedure lane: add UP (needs process instance)
        slot = pg.locator('#laneUP .slot[data-seq="top"][data-index="1"]')
        await slot.hover()
        await slot.locator(".slot-add").click()
        await pg.click("#popover .menu-item:has-text('Unit procedure')")
        await pg.fill("#dName", "Hold")
        await pg.click("#modalOk")
        check((await pretty(pg, "up")) == "UP, Hold", "add unit procedure: " + await pretty(pg, "up"))

        # ---- recipe details panels render in edit mode
        await pg.click("button[data-cmd=details]")
        await pg.wait_for_selector("#headerBody input")
        await pg.fill('#headerBody input[data-bind="header:productName"]', "Test product")
        await pg.press('#headerBody input[data-bind="header:productName"]', "Tab")
        await pg.screenshot(path=os.path.join(OUT, "04_details.png"), full_page=True)
        await pg.click("button[data-cmd=details]")

        # ---- save: author + comment, download, validate the file offline with the Node core
        await pg.click("button[data-cmd=save]")
        await pg.fill("#sAuthor", "UI test")
        await pg.fill("#sComment", "Automated UI test")
        async with pg.expect_download() as dl:
            await pg.click("#modalOk")
        d = await dl.value
        path = os.path.join(OUT, "saved.xml")
        await d.save_as(path)
        check(os.path.getsize(path) > 1000, "download saved")
        ver = await pg.text_content("#versionLabel")
        check(ver == "V2", "version badge increments: " + ver)
        node = subprocess.run(["node", os.path.join(ROOT, "tests", "check-file.js"), path], capture_output=True, text=True)
        check(node.returncode == 0, "saved file reloads with every route valid: " + (node.stdout + node.stderr).strip())

        # ---- reopen the saved file in the UI
        await pg.set_input_files("#fileInput", path)
        await pg.wait_for_timeout(300)
        check((await pretty(pg, "up")) == "UP, Hold", "saved file reopens in the UI")
        await pg.screenshot(path=os.path.join(OUT, "05_reopened.png"))

        # ---- a large production recipe renders
        await pg.set_input_files("#fileInput", os.path.join(FIX, "GM_A17392.xml"))
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=os.path.join(OUT, "06_production_recipe.png"))
        check(await pg.locator("#lanePH .node").count() > 3, "production recipe renders")

        # ---- bill of materials: where used, edit allocation, go to phase
        await pg.click("button[data-cmd=details]")
        await pg.locator('#bomBody .bom-toggle:not([disabled])').first.click()
        rows = await pg.locator("#bomBody tr.bom-detail table.inner tbody tr").count()
        check(rows >= 2, f"material expands to where-used rows ({rows - 1} uses + total)")
        await pg.screenshot(path=os.path.join(OUT, "10_bom_where_used.png"), full_page=True)
        qty = pg.locator('#bomBody tr.bom-detail input[data-bind^="param:"]').first
        bind = await qty.get_attribute("data-bind")
        await qty.fill("7.5")
        await qty.press("Tab")
        _, rid, pname = bind.split(":")
        v = await pg.evaluate(f"() => {{ const d = BatchEditor.app.state.doc; return d.phaseParams(d.re('{rid}')).find(p => p.name === '{pname}').value; }}")
        check(v == "7.5", "allocation edited from the BOM: " + str(v))
        check(await pg.locator("#bomBody tr.bom-detail").count() == 1, "row stays expanded after edit")
        await pg.locator('#bomBody tr.bom-detail button[data-cmd=gotoPhase]').first.click()
        await pg.wait_for_timeout(300)
        sel = await pg.evaluate("() => BatchEditor.app.state.sel && BatchEditor.app.state.sel.key")
        check(sel == "S:" + rid and await pg.locator(f'#lanePH .node.sel[data-key="S:{rid}"]').count() == 1, "Go to selects the phase in its operation")
        await pg.screenshot(path=os.path.join(OUT, "11_goto_phase.png"))
        await pg.click("button[data-cmd=details]")

        # ---- keyboard Delete on a selected phase
        before_del = await pretty(pg)
        await pg.locator("#lanePH .node.step").first.click()
        await pg.click("#props .x")
        await pg.keyboard.press("Delete")
        after_del = await pretty(pg)
        check(after_del == ", ".join(before_del.split(", ")[1:]), "Delete key removes the selected phase: " + after_del[:60])

        # ---- print view renders every route
        await pg.evaluate("() => { window.print = () => {}; }")
        await pg.click("button[data-cmd=print]")
        n = await pg.locator("#printView .flow").count()
        check(n > 20, f"print view renders all routes ({n})")

        # ---- brand-new recipe from scratch
        await pg.click("button[data-cmd=new]")
        await pg.fill("#nId", "GM_TEST1")
        await pg.fill("#nDesc", "Built from scratch")
        await pg.fill("#nBatch", "1000")
        await pg.click("#modalOk")
        await pg.select_option("#addClassSel", "sFormulation")
        await pg.click("button[data-cmd=addClass]")
        check(await pg.locator("#eqBody .eq-class").count() == 1, "process class added")
        await pg.click("button[data-cmd=addMaterial]")
        await pg.fill('#bomBody input[data-bind$=":materialId"]', "93405")
        await pg.press('#bomBody input[data-bind$=":materialId"]', "Tab")
        await pg.fill('#bomBody input[data-bind$=":value"]', "12.5")
        await pg.press('#bomBody input[data-bind$=":value"]', "Tab")
        await pg.click("button[data-cmd=details]")
        await pg.click('#laneUP .slot-empty .slot-add')
        await pg.click("#popover .menu-item:has-text('Unit procedure')")
        await pg.fill("#dName", "Formulation")
        await pg.click("#modalOk")
        await pg.click('#laneOP .slot-empty .slot-add')
        await pg.click("#popover .menu-item:has-text('Operation')")
        await pg.fill("#dName", "Mix")
        await pg.click("#modalOk")
        await pg.click('#lanePH .slot-empty .slot-add')
        await pg.click("#popover .menu-item:has-text('Process phase')")
        await pg.click("#popover .menu-item:has-text('feedPWater')")
        await pg.locator('#lanePH .slot[data-index="1"] .slot-add').click(force=True)
        await pg.click("#popover .menu-item:has-text('Branch')")
        await pg.fill("#bCount", "2")
        await pg.click("#modalOk")
        par_uid = await pg.evaluate("() => BatchEditor.app.state.trees.ph.seq[1].uid")
        await pg.click(f'#lanePH .slot[data-seq="{par_uid}:0"] .slot-add')
        await pg.click("#popover .menu-item:has-text('Process phase')")
        await pg.click("#popover .menu-item:has-text('mixerOn')")
        par_uid = await pg.evaluate("() => BatchEditor.app.state.trees.ph.seq[1].uid")
        await pg.click(f'#lanePH .slot[data-seq="{par_uid}:1"] .slot-add')
        await pg.click("#popover .menu-item:has-text('Loop back')")
        check((await pretty(pg)) == "feedPWater, ||[mixerOn | LOOP{}]", "built route: " + await pretty(pg))
        # assign the BOM material to feedPWater's quantity
        await (await card(pg, "lanePH", "feedPWater")).click()
        fid = await pg.evaluate("() => BatchEditor.app.state.doc.materials()[0].id")
        await pg.select_option('#propsBody select[data-bind$=":quantity"]', fid)
        await pg.fill('#propsBody input[data-bind$=":quantity"]', "12.5")
        await pg.press('#propsBody input[data-bind$=":quantity"]', "Tab")
        chip = await (await card(pg, "lanePH", "feedPWater")).locator(".pchip.mat").text_content()
        check("PROPYLENE" in chip and "12.5" in chip, "material assigned to phase: " + chip)
        await pg.screenshot(path=os.path.join(OUT, "07_new_recipe.png"))
        await pg.click("button[data-cmd=save]")
        await pg.fill("#sAuthor", "UI test")
        await pg.fill("#sComment", "New recipe")
        async with pg.expect_download() as dl:
            await pg.click("#modalOk")
        path2 = os.path.join(OUT, "new_recipe.xml")
        await (await dl.value).save_as(path2)
        node = subprocess.run(["node", os.path.join(ROOT, "tests", "check-file.js"), path2], capture_output=True, text=True)
        check(node.returncode == 0 and "3 routes valid" in node.stdout, "new recipe file valid: " + (node.stdout + node.stderr).strip())

        # ---- execute-one branch with 5 lanes through the dialog, then switch mode
        await pg.locator('#lanePH .slot[data-seq="top"][data-index="2"] .slot-add').click(force=True)
        await pg.click("#popover .menu-item:has-text('Branch')")
        await pg.check('input[name="bMode"][value="Serial"]')
        await pg.fill("#bCount", "5")
        await pg.screenshot(path=os.path.join(OUT, "08_branch_dialog.png"))
        await pg.click("#modalOk")
        info = await pg.evaluate("() => { const p = BatchEditor.app.state.trees.ph.seq[2]; return p.mode + ':' + p.lanes.length; }")
        check(info == "Serial:5", "execute-one branch with 5 lanes: " + info)
        check(await pg.locator("#lanePH .par.serial").count() == 1, "serial branch drawn differently")
        await pg.screenshot(path=os.path.join(OUT, "09_serial_branch.png"))
        await pg.locator("#lanePH .par.serial .par-bar.fork .kebab").click()
        await pg.click("#popover .menu-item:has-text('Change to execute all')")
        info = await pg.evaluate("() => BatchEditor.app.state.trees.ph.seq[2].mode")
        check(info == "Parallel", "change branch to execute all: " + info)
        await pg.click("#btnUndo")
        check((await pg.evaluate("() => BatchEditor.app.state.trees.ph.seq[2].mode")) == "Serial", "undo mode change")

        check(not errors, "no page errors: " + "; ".join(errors))
        await b.close()
    failed = [m for ok, m in results if not ok]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
    sys.exit(1 if failed else 0)

asyncio.run(main())
