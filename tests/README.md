# 测试文档

## 测试框架

本项目使用以下测试框架：

- **单元测试**：Jest 或 Mocha + Chai
- **集成测试**：Puppeteer 或 Playwright
- **E2E 测试**：Chrome Extension Testing

## 测试结构

```
tests/
├── unit/              # 单元测试
│   ├── validator.test.js
│   ├── errorHandler.test.js
│   ├── performance.test.js
│   └── utils.test.js
├── integration/       # 集成测试
│   ├── tabManager.test.js
│   └── popup.test.js
└── e2e/              # E2E 测试
    └── user-scenarios.test.js
```

## 运行测试

```bash
# 安装依赖
npm install

# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage
```

## 测试覆盖率目标

- 单元测试：> 80%
- 集成测试：> 60%
- 核心功能：100%

## 编写测试

### 单元测试示例

```javascript
// tests/unit/validator.test.js
describe('Validator', () => {
  describe('isValidUrl', () => {
    test('should return true for valid URLs', () => {
      expect(Validator.isValidUrl('https://example.com')).toBe(true);
      expect(Validator.isValidUrl('http://example.com')).toBe(true);
    });

    test('should return false for invalid URLs', () => {
      expect(Validator.isValidUrl('not-a-url')).toBe(false);
      expect(Validator.isValidUrl('')).toBe(false);
      expect(Validator.isValidUrl(null)).toBe(false);
    });
  });

  describe('validateSessionName', () => {
    test('should validate session names correctly', () => {
      const result = Validator.validateSessionName('My Session');
      expect(result.valid).toBe(true);
    });

    test('should reject empty names', () => {
      const result = Validator.validateSessionName('');
      expect(result.valid).toBe(false);
    });

    test('should reject names with dangerous characters', () => {
      const result = Validator.validateSessionName('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
    });
  });
});
```

### 集成测试示例

```javascript
// tests/integration/tabManager.test.js
describe('TabManager Integration', () => {
  test('should load and classify tabs', async () => {
    const tabManager = new TabManager();
    const tabs = await tabManager.getAllTabsWithInfo();
    
    expect(tabs).toBeInstanceOf(Array);
    expect(tabs.length).toBeGreaterThan(0);
    expect(tabs[0]).toHaveProperty('category');
    expect(tabs[0]).toHaveProperty('anxietyScore');
  });

  test('should save and restore sessions', async () => {
    const tabManager = new TabManager();
    const sessionName = 'Test Session';
    
    await tabManager.saveSession(sessionName);
    const sessions = await tabManager.getSessions();
    
    expect(sessions).toContainEqual(
      expect.objectContaining({ name: sessionName })
    );
  });
});
```

## 持续集成

测试将在以下情况自动运行：

- 每次提交代码
- 创建 Pull Request
- 发布新版本前

## 测试最佳实践

1. **测试隔离**：每个测试应该独立运行，不依赖其他测试
2. **清理数据**：测试后清理创建的数据和状态
3. **模拟外部依赖**：使用 mock 模拟 Chrome API
4. **测试边界情况**：测试正常情况、边界情况和错误情况
5. **可读性**：测试代码应该清晰易懂

