// 单元测试：验证器模块

/**
 * 验证器测试套件
 * 
 * 测试 validator.js 中的所有验证函数
 */

// 注意：这需要在实际测试环境中运行
// 当前作为示例和模板

describe('Validator', () => {
  describe('isValidUrl', () => {
    test('should return true for valid HTTP URLs', () => {
      expect(Validator.isValidUrl('http://example.com')).toBe(true);
      expect(Validator.isValidUrl('http://www.example.com')).toBe(true);
    });

    test('should return true for valid HTTPS URLs', () => {
      expect(Validator.isValidUrl('https://example.com')).toBe(true);
      expect(Validator.isValidUrl('https://www.example.com/path')).toBe(true);
    });

    test('should return false for invalid URLs', () => {
      expect(Validator.isValidUrl('not-a-url')).toBe(false);
      expect(Validator.isValidUrl('example.com')).toBe(false);
      expect(Validator.isValidUrl('')).toBe(false);
      expect(Validator.isValidUrl(null)).toBe(false);
      expect(Validator.isValidUrl(undefined)).toBe(false);
    });
  });

  describe('isValidTabId', () => {
    test('should return true for valid tab IDs', () => {
      expect(Validator.isValidTabId(1)).toBe(true);
      expect(Validator.isValidTabId(100)).toBe(true);
      expect(Validator.isValidTabId(999999)).toBe(true);
    });

    test('should return false for invalid tab IDs', () => {
      expect(Validator.isValidTabId(0)).toBe(false);
      expect(Validator.isValidTabId(-1)).toBe(false);
      expect(Validator.isValidTabId('1')).toBe(false);
      expect(Validator.isValidTabId(null)).toBe(false);
      expect(Validator.isValidTabId(undefined)).toBe(false);
    });
  });

  describe('validateSessionName', () => {
    test('should accept valid session names', () => {
      const result = Validator.validateSessionName('My Session');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('');
    });

    test('should reject empty names', () => {
      const result = Validator.validateSessionName('');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能为空');
    });

    test('should reject names with only whitespace', () => {
      const result = Validator.validateSessionName('   ');
      expect(result.valid).toBe(false);
    });

    test('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      const result = Validator.validateSessionName(longName);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过100个字符');
    });

    test('should reject names with dangerous characters', () => {
      const dangerousNames = [
        '<script>alert("xss")</script>',
        'Name with "quotes"',
        "Name with 'quotes'",
        'Name with <tags>',
        'Name with &amp;'
      ];

      dangerousNames.forEach(name => {
        const result = Validator.validateSessionName(name);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('非法字符');
      });
    });
  });

  describe('validateRegex', () => {
    test('should accept valid regex patterns', () => {
      const result = Validator.validateRegex('test');
      expect(result.valid).toBe(true);
      expect(result.regex).toBeInstanceOf(RegExp);
    });

    test('should accept complex regex patterns', () => {
      const result = Validator.validateRegex('^https?://.*');
      expect(result.valid).toBe(true);
      expect(result.regex).toBeInstanceOf(RegExp);
    });

    test('should reject invalid regex patterns', () => {
      const result = Validator.validateRegex('[invalid');
      expect(result.valid).toBe(false);
      expect(result.regex).toBeNull();
      expect(result.message).toContain('无效的正则表达式');
    });
  });

  describe('isInRange', () => {
    test('should return true for values in range', () => {
      expect(Validator.isInRange(5, 1, 10)).toBe(true);
      expect(Validator.isInRange(1, 1, 10)).toBe(true);
      expect(Validator.isInRange(10, 1, 10)).toBe(true);
    });

    test('should return false for values out of range', () => {
      expect(Validator.isInRange(0, 1, 10)).toBe(false);
      expect(Validator.isInRange(11, 1, 10)).toBe(false);
      expect(Validator.isInRange('5', 1, 10)).toBe(true); // 字符串数字会被转换
    });
  });

  describe('isValidArray', () => {
    test('should return true for valid arrays', () => {
      expect(Validator.isValidArray([1, 2, 3])).toBe(true);
      expect(Validator.isValidArray([])).toBe(true);
    });

    test('should return false for non-arrays', () => {
      expect(Validator.isValidArray('not an array')).toBe(false);
      expect(Validator.isValidArray(null)).toBe(false);
      expect(Validator.isValidArray({})).toBe(false);
    });

    test('should validate array length', () => {
      expect(Validator.isValidArray([1, 2], 2, 5)).toBe(true);
      expect(Validator.isValidArray([1], 2, 5)).toBe(false);
      expect(Validator.isValidArray([1, 2, 3, 4, 5, 6], 2, 5)).toBe(false);
    });
  });
});

describe('XSSProtection', () => {
  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      expect(XSSProtection.escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      
      expect(XSSProtection.escapeHtml('&'))
        .toBe('&amp;');
      
      expect(XSSProtection.escapeHtml("'"))
        .toBe('&#039;');
    });

    test('should handle non-string inputs', () => {
      expect(XSSProtection.escapeHtml(null)).toBe('null');
      expect(XSSProtection.escapeHtml(123)).toBe('123');
    });
  });

  describe('sanitizeUrl', () => {
    test('should accept valid HTTP/HTTPS URLs', () => {
      expect(XSSProtection.sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(XSSProtection.sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    test('should reject dangerous protocols', () => {
      expect(XSSProtection.sanitizeUrl('javascript:alert("xss")')).toBeNull();
      expect(XSSProtection.sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBeNull();
      expect(XSSProtection.sanitizeUrl('vbscript:msgbox("xss")')).toBeNull();
    });

    test('should handle invalid URLs', () => {
      expect(XSSProtection.sanitizeUrl('not-a-url')).toBeNull();
      expect(XSSProtection.sanitizeUrl('')).toBeNull();
      expect(XSSProtection.sanitizeUrl(null)).toBeNull();
    });
  });

  describe('sanitizeInput', () => {
    test('should remove control characters', () => {
      const input = 'test\x00\x1F\x7F';
      const result = XSSProtection.sanitizeInput(input);
      expect(result).toBe('test');
    });

    test('should limit length', () => {
      const input = 'a'.repeat(200);
      const result = XSSProtection.sanitizeInput(input, { maxLength: 100 });
      expect(result.length).toBe(100);
    });

    test('should trim whitespace', () => {
      const result = XSSProtection.sanitizeInput('  test  ');
      expect(result).toBe('test');
    });

    test('should escape HTML by default', () => {
      const result = XSSProtection.sanitizeInput('<script>');
      expect(result).toBe('&lt;script&gt;');
    });
  });
});

describe('DataValidator', () => {
  describe('validateTab', () => {
    test('should validate correct tab data', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example'
      };
      const result = DataValidator.validateTab(tab);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid tab data', () => {
      const invalidTabs = [
        null,
        { id: 0 },
        { id: 1, url: 'invalid' },
        { id: 1, url: 'https://example.com' } // 缺少 title
      ];

      invalidTabs.forEach(tab => {
        const result = DataValidator.validateTab(tab);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateSession', () => {
    test('should validate correct session data', () => {
      const session = {
        name: 'Test Session',
        tabs: [
          { id: 1, url: 'https://example.com', title: 'Example' }
        ]
      };
      const result = DataValidator.validateSession(session);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid session data', () => {
      const invalidSessions = [
        null,
        { name: '' },
        { name: '<script>' },
        { name: 'Valid', tabs: 'not an array' }
      ];

      invalidSessions.forEach(session => {
        const result = DataValidator.validateSession(session);
        expect(result.valid).toBe(false);
      });
    });
  });
});

