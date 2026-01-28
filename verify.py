from playwright.sync_api import sync_playwright
import os, subprocess, time

def verify():
    server_process = subprocess.Popen(["python3", "-m", "http.server", "--directory", "public", "8000"])
    time.sleep(2)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.route("**/analyze/**", lambda route: route.fulfill(status=200, content_type="application/json", body='{"isUgoira": false, "title": "Test Artwork", "images": ["/test1.jpg"]}'))
            page.goto("http://localhost:8000")
            page.fill("#inputUrl", "123")
            page.click("#goBtn")
            page.wait_for_selector(".single-view img", timeout=5000)
            page.screenshot(path="/home/jules/verification/bolt_optimization.png")
            browser.close()
    finally:
        server_process.terminate()

if __name__ == "__main__":
    verify()
