/**
 * Screenshot Helper Utility for Playwright E2E Tests
 * 
 * This utility provides enhanced screenshot functionality for capturing
 * all screens throughout the application in a systematic way.
 */

class ScreenshotHelper {
  constructor(page, testName = 'test') {
    this.page = page;
    this.testName = testName;
    this.screenshotCounter = 1;
    this.screenshotLog = [];
  }

  /**
   * Take a numbered screenshot with description
   * @param {string} description - Description of what the screenshot shows
   * @param {object} options - Additional screenshot options
   */
  async takeScreenshot(description, options = {}) {
    const defaultOptions = {
      fullPage: true,
      animations: 'disabled',
      ...options
    };

    const filename = `${this.testName}-${String(this.screenshotCounter).padStart(3, '0')}-${description}.png`;
    const path = `screenshots/${filename}`;
    
    await this.page.screenshot({ 
      path,
      ...defaultOptions
    });

    const logEntry = {
      number: this.screenshotCounter,
      description,
      filename,
      timestamp: new Date().toISOString()
    };
    
    this.screenshotLog.push(logEntry);
    console.log(`📸 Screenshot ${this.screenshotCounter}: ${description}`);
    this.screenshotCounter++;

    return path;
  }

  /**
   * Take responsive screenshots at multiple viewport sizes
   * @param {string} baseName - Base name for the screenshots
   * @param {array} viewports - Array of viewport configurations
   */
  async takeResponsiveScreenshots(baseName, viewports = null) {
    const defaultViewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 414, height: 896, name: 'mobile-large' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 320, height: 568, name: 'mobile-small' }
    ];

    const viewportsToUse = viewports || defaultViewports;
    const originalViewport = this.page.viewportSize();

    for (const viewport of viewportsToUse) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500); // Allow time for reflow
      await this.takeScreenshot(`${baseName}-${viewport.name}`);
    }

    // Reset to original viewport
    if (originalViewport) {
      await this.page.setViewportSize(originalViewport);
    } else {
      await this.page.setViewportSize({ width: 1920, height: 1080 });
    }
  }

  /**
   * Take a screenshot of a specific element
   * @param {string} selector - CSS selector for the element
   * @param {string} description - Description of the element
   */
  async takeElementScreenshot(selector, description) {
    const element = this.page.locator(selector).first();
    if (await element.isVisible()) {
      const filename = `${this.testName}-${String(this.screenshotCounter).padStart(3, '0')}-${description}.png`;
      const path = `screenshots/${filename}`;
      
      await element.screenshot({ path });
      
      const logEntry = {
        number: this.screenshotCounter,
        description: `Element: ${description}`,
        filename,
        timestamp: new Date().toISOString(),
        element: selector
      };
      
      this.screenshotLog.push(logEntry);
      console.log(`📸 Element Screenshot ${this.screenshotCounter}: ${description}`);
      this.screenshotCounter++;

      return path;
    } else {
      console.log(`⚠️ Element not visible for screenshot: ${selector}`);
      return null;
    }
  }

  /**
   * Take screenshots before and after an action
   * @param {string} actionDescription - Description of the action
   * @param {function} action - Async function containing the action to perform
   */
  async screenshotAction(actionDescription, action) {
    await this.takeScreenshot(`before-${actionDescription}`);
    
    const result = await action();
    
    await this.takeScreenshot(`after-${actionDescription}`);
    
    return result;
  }

  /**
   * Take a screenshot with automatic error handling
   * @param {string} description - Description of the screenshot
   * @param {object} options - Screenshot options
   */
  async safeScreenshot(description, options = {}) {
    try {
      return await this.takeScreenshot(description, options);
    } catch (error) {
      console.error(`❌ Screenshot failed for "${description}":`, error.message);
      return null;
    }
  }

  /**
   * Compare two screenshots (requires additional setup for visual comparison)
   * @param {string} baselineDir - Directory containing baseline screenshots
   * @param {string} description - Description for comparison
   */
  async compareScreenshot(baselineDir, description) {
    const filename = `${description}-comparison.png`;
    const screenshotPath = `screenshots/${filename}`;
    const baselinePath = `${baselineDir}/${filename}`;
    
    await this.page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    // Note: Actual visual comparison would require additional libraries
    // This is a placeholder for future implementation
    console.log(`📸 Comparison screenshot saved: ${filename}`);
    console.log(`📂 Compare with baseline: ${baselinePath}`);
    
    return { screenshot: screenshotPath, baseline: baselinePath };
  }

  /**
   * Take screenshots of all major UI components on current page
   */
  async screenshotAllComponents() {
    const commonSelectors = [
      { selector: 'header', name: 'header' },
      { selector: 'nav', name: 'navigation' },
      { selector: 'main', name: 'main-content' },
      { selector: 'footer', name: 'footer' },
      { selector: '.card', name: 'cards' },
      { selector: 'form', name: 'forms' },
      { selector: '.modal', name: 'modals' },
      { selector: '.dialog', name: 'dialogs' }
    ];

    for (const { selector, name } of commonSelectors) {
      await this.takeElementScreenshot(selector, name);
    }
  }

  /**
   * Generate a report of all screenshots taken
   */
  generateReport() {
    const report = {
      testName: this.testName,
      totalScreenshots: this.screenshotCounter - 1,
      screenshots: this.screenshotLog,
      generatedAt: new Date().toISOString()
    };

    console.log(`\n📊 Screenshot Report for ${this.testName}:`);
    console.log(`Total screenshots: ${report.totalScreenshots}`);
    
    this.screenshotLog.forEach((entry, index) => {
      console.log(`  ${entry.number}. ${entry.description} (${entry.filename})`);
    });

    return report;
  }

  /**
   * Wait for page to be stable before taking screenshot
   * @param {number} timeout - Maximum time to wait in milliseconds
   */
  async waitForStability(timeout = 3000) {
    await this.page.waitForLoadState('networkidle', { timeout });
    await this.page.waitForTimeout(500); // Additional buffer for animations
  }

  /**
   * Setup clean page environment for consistent screenshots
   */
  async setupCleanEnvironment() {
    // Suppress React DevTools messages
    await this.page.addInitScript(() => {
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (!message.includes('React DevTools') && 
            !message.includes('Download the React DevTools')) {
          originalLog.apply(console, args);
        }
      };

      // Set consistent user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: false
      });
    });

    // Hide browser compatibility warnings
    await this.page.addStyleTag({
      content: `
        .bg-yellow-100, [class*="bg-yellow"], .border-yellow-500, [class*="border-yellow"] {
          display: none !important;
        }
        div:has(svg[viewBox="0 0 20 20"]) {
          display: none !important;
        }
        /* Hide scrollbars for consistent screenshots */
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `
    });
  }
}

module.exports = ScreenshotHelper;