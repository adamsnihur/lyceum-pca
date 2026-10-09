import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        console_errors = []
        page_errors = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        html_path = "file://" + os.path.abspath("index.html")
        print(f"Loading {html_path}...")
        await page.goto(html_path, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2500)

        print(f"Console errors on load: {len(console_errors)} -> {console_errors}")
        print(f"Page errors on load: {len(page_errors)} -> {page_errors}")

        # Assert no errors on initial load
        assert len(console_errors) == 0, f"Unexpected console errors: {console_errors}"
        assert len(page_errors) == 0, f"Unexpected page errors: {page_errors}"

        # 1. Test Module 1: Slider angle change
        print("Testing Module 1 Slider Angle...")
        slider_angle = page.locator("#m1SliderAngle")
        await slider_angle.fill("75")
        await slider_angle.dispatch_event("input")
        await page.wait_for_timeout(300)
        val_angle = await page.locator("#m1ValAngle").inner_text()
        print(f"Module 1 Angle Value: {val_angle}")
        assert "75" in val_angle

        # Test Module 1 Optimum button
        print("Testing Module 1 Optimum button...")
        btn_optimum = page.locator("#m1BtnOptimum")
        await btn_optimum.click()
        await page.wait_for_timeout(300)
        status_text = await page.locator("#m1OutStatus").inner_text()
        print(f"Module 1 Optimum Status: {status_text}")
        assert "PC1" in status_text

        # 2. Test Module 3: Sandbox 2D (Correlation slider)
        print("Testing Module 3 Correlation Slider...")
        slider_rho = page.locator("#m3SliderRho")
        await slider_rho.evaluate("el => { el.value = '0.90'; el.dispatchEvent(new Event('input')); }")
        await page.wait_for_timeout(300)
        val_rho = await page.locator("#m3ValRho").inner_text()
        cov_pca_offdiag = await page.locator("#m3CovPca01").inner_text()
        print(f"Module 3 Rho: {val_rho}, PCA Off-diagonal Covariance: {cov_pca_offdiag}")
        assert "0.90" in val_rho
        assert cov_pca_offdiag == "0.00"

        # 3. Test Module 4: Scree threshold slider
        print("Testing Module 4 Scree Threshold Slider...")
        slider_thresh = page.locator("#m4SliderThreshold")
        await slider_thresh.evaluate("el => { el.value = '95'; el.dispatchEvent(new Event('input')); }")
        await page.wait_for_timeout(300)
        val_thresh = await page.locator("#m4ValThreshold").inner_text()
        badge_comp = await page.locator("#m4BadgeComponents").inner_text()
        print(f"Module 4 Threshold: {val_thresh}, Components: {badge_comp}")
        assert "95%" in val_thresh
        assert "składowe" in badge_comp

        # 4. Test Module 5: StandardScaler toggle
        print("Testing Module 5 Scale Toggle...")
        btn_scale = page.locator("#m5BtnToggleScale")
        await btn_scale.click()
        await page.wait_for_timeout(200)
        scale_text = await page.locator("#m5ScaleStatusText").inner_text()
        print(f"Module 5 Scale Text: {scale_text}")
        assert "WYŁĄCZONY" in await btn_scale.inner_text() or "Brak skalowania" in scale_text

        # 5. Test Module 6: Quiz interaction
        print("Testing Module 6 Quiz Questions...")
        q1_btn_b = page.locator('.quiz-item[data-q="1"] button[data-opt="B"]')
        await q1_btn_b.click()
        await page.wait_for_timeout(200)

        q2_btn_a = page.locator('.quiz-item[data-q="2"] button[data-opt="A"]')
        await q2_btn_a.click()
        await page.wait_for_timeout(200)

        score_text = await page.locator("#quizScoreBadge").inner_text()
        print(f"Quiz score after 2 questions: {score_text}")
        assert "2 / 5" in score_text

        # 6. Test Module 7: Code Tab switching
        print("Testing Module 7 Code Tabs...")
        tab_svd = page.locator('button.code-tab-btn[data-tab="numpy-svd"]')
        await tab_svd.click()
        await page.wait_for_timeout(200)
        svd_visible = await page.locator("#codeTab-numpy-svd").is_visible()
        print(f"SVD Tab visible: {svd_visible}")
        assert svd_visible is True

        # Quality Gate: SVG Text Clipping & DOM Overflow Check
        print("Running Quality Gate: SVG Text Clipping & DOM Overflow Check...")
        clipped_svg = await page.evaluate('''() => {
            const issues = [];
            document.querySelectorAll('svg').forEach(svg => {
                const vb = svg.viewBox.baseVal;
                if (!vb || vb.width === 0) return;
                svg.querySelectorAll('text, tspan').forEach(t => {
                    const text = t.textContent.trim();
                    if (!text) return;
                    try {
                        const bbox = t.getBBox();
                        if (bbox.x < vb.x - 2 || (bbox.x + bbox.width) > (vb.x + vb.width + 2)) {
                            issues.push({ text: text, x: bbox.x, width: bbox.width, vb_x: vb.x, vb_w: vb.width });
                        }
                    } catch (e) {}
                });
            });
            return issues;
        }''')
        print(f"SVG Text clipping issues found: {len(clipped_svg)}")
        assert len(clipped_svg) == 0, f"Found clipped SVG text elements: {clipped_svg}"

        # Multi-viewport responsive tests
        viewports = [
            ("Desktop 1440px", {"width": 1440, "height": 900}),
            ("Tablet 768px", {"width": 768, "height": 1024}),
            ("Mobile 375px", {"width": 375, "height": 812})
        ]
        for name, vp in viewports:
            await page.set_viewport_size(vp)
            await page.wait_for_timeout(300)
            has_h_scroll = await page.evaluate('''() => {
                return document.documentElement.scrollWidth > window.innerWidth + 2;
            }''')
            print(f"Viewport {name} -> Horizontal scroll detected: {has_h_scroll}")
            assert not has_h_scroll, f"Horizontal scroll detected on {name}!"

        # Reset viewport to 1440px and capture verified screenshot
        await page.set_viewport_size({"width": 1440, "height": 900})
        screenshot_path = os.path.abspath("screenshot_verified.png")
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Saved full-page screenshot to {screenshot_path}")

        print("=== ALL TEST GATES PASSED WITH 0 ERRORS ===")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
