# MovieHub 国际化 (i18n) 实现文档

## 概述

本项目已成功实现国际化支持，支持中文（简体）和英文两种语言。采用 **Context + localStorage** 方案，无需路由切换语言。

## 技术栈

- **i18n 框架**: 自定义 React Context
- **支持语言**: 
  - 中文（简体）- `zh`
  - English - `en`
- **默认语言**: 中文（简体）
- **持久化**: localStorage

## 核心特性

✅ **无需路由切换** - 语言切换不需要改变 URL  
✅ **即时生效** - 切换语言立即生效，无需刷新页面  
✅ **状态持久化** - 语言偏好保存在 localStorage  
✅ **浏览器语言检测** - 首次访问自动检测浏览器语言  
✅ **类型安全** - TypeScript 类型支持  

## 文件结构

```
movie-next/
├── messages/                    # 翻译文件目录
│   ├── zh.json                 # 中文翻译
│   └── en.json                 # 英文翻译
├── contexts/
│   └── LocaleContext.tsx      # 语言上下文
├── components/
│   └── LanguageSwitcher.tsx   # 语言切换组件
└── app/
    ├── (frontend)/
    │   └── layout.tsx          # 前台布局（已集成 LocaleProvider）
    └── (backend)/
        ├── layout.tsx          # 后台布局（已集成 LocaleProvider）
        └── admin/
            └── AdminLayoutClient.tsx  # 后台管理（使用 useTranslations）
```

## 实现方式

### 1. LocaleContext（语言上下文）

**文件**: `contexts/LocaleContext.tsx`

提供全局语言状态管理：

```tsx
import { LocaleProvider, useLocale, useTranslations } from '@/contexts/LocaleContext';

// 在顶层布局中使用
<LocaleProvider>
  <App />
</LocaleProvider>

// 在组件中使用
const { locale, setLocale } = useLocale();
const { t } = useTranslations('moduleName');
```

**功能**:
- 管理全局语言状态（zh/en）
- 提供翻译函数 `t()`
- 自动从 localStorage 恢复语言设置
- 自动检测浏览器语言
- 更新 HTML lang 属性

### 2. LanguageSwitcher（语言切换器）

**文件**: `components/LanguageSwitcher.tsx`

使用 Ant Design Select 组件实现：

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

<LanguageSwitcher />
```

**特点**:
- 简洁的下拉选择器
- 支持 GlobalOutlined 图标
- 即时切换语言

### 3. 翻译文件

翻译文件采用嵌套的 JSON 结构，按功能模块划分：

```json
{
  "common": { ... },
  "nav": { ... },
  "admin": { ... },
  ...
}
```

## 使用方法

### 基础用法

#### 1. 在前台组件中使用

```tsx
'use client';

import { useTranslations } from '@/contexts/LocaleContext';

export default function Navbar() {
  const { t } = useTranslations('nav');
  
  return (
    <nav>
      <a>{t('home')}</a>        {/* 中文：首页，英文：Home */}
      <a>{t('movies')}</a>      {/* 中文：电影，英文：Movies */}
      <LanguageSwitcher />
    </nav>
  );
}
```

#### 2. 在后台管理组件中使用

```tsx
'use client';

import { useTranslations } from '@/contexts/LocaleContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AdminLayout() {
  const { t } = useTranslations('admin');
  
  return (
    <div>
      <LanguageSwitcher />
      <h1>{t('dashboard')}</h1>
      <nav>
        <Link href="/admin/movies">{t('movieManagement')}</Link>
        <Link href="/admin/users">{t('userManagement')}</Link>
      </nav>
    </div>
  );
}
```

#### 3. 多个命名空间

```tsx
const { t: tNav } = useTranslations('nav');
const { t: tAdmin } = useTranslations('admin');

<div>
  {tNav('home')}           {/* nav.home */}
  {tAdmin('dashboard')}    {/* admin.dashboard */}
</div>
```

#### 4. 直接使用 useLocale

```tsx
import { useLocale } from '@/contexts/LocaleContext';

export default function Component() {
  const { locale, setLocale, t } = useLocale();
  
  return (
    <div>
      <p>当前语言: {locale}</p>
      <button onClick={() => setLocale('en')}>切换到英文</button>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

## 翻译模块

### 已实现的模块（共 10 个）

| 模块 | 说明 | 示例 |
|------|------|------|
| `common` | 通用文本 | appName, loading, submit, cancel, save, edit, delete |
| `nav` | 导航栏 | home, movies, tv, variety, anime, documentary, sports |
| `home` | 首页 | heroTitle, watchNow, latestMovies, hotMovies |
| `movie` | 影片信息 | title, year, rating, type, country, duration, director |
| `user` | 用户相关 | username, email, password, login, register, logout |
| `comment` | 评论功能 | title, placeholder, submit, reply, like, dislike |
| `admin` | 后台管理 | dashboard, movieManagement, userManagement, systemSettings |
| `category` | 分类管理 | types, tags, countries, addAction, editAction |
| `analytics` | 数据分析 | totalPlays, registeredUsers, avgWatchTime |
| `settings` | 系统设置 | siteName, siteDescription, maintenanceMode |
| `filter` | 筛选功能 | allTypes, allYears, allCountries |

### 查看完整翻译

- 中文翻译: `messages/zh.json`
- 英文翻译: `messages/en.json`

## 添加新翻译

### 1. 编辑翻译文件

在 `messages/zh.json` 和 `messages/en.json` 中添加：

```json
{
  "myModule": {
    "key1": "中文文本",
    "key2": "另一个文本"
  }
}
```

### 2. 在组件中使用

```tsx
const { t } = useTranslations('myModule');

<div>{t('key1')}</div>
```

## 添加新语言

### 1. 创建翻译文件

创建 `messages/ja.json`（日语）：

```json
{
  "common": {
    "appName": "MovieHub",
    "loading": "読み込み中...",
    ...
  },
  ...
}
```

### 2. 更新 LocaleContext

在 `contexts/LocaleContext.tsx` 中：

```tsx
export type Locale = 'zh' | 'en' | 'ja';

import jaMessages from '@/messages/ja.json';

const messages: Record<Locale, any> = {
  zh: zhMessages,
  en: enMessages,
  ja: jaMessages,
};
```

### 3. 更新语言切换器

在 `components/LanguageSwitcher.tsx` 中：

```tsx
options={[
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]}
```

## 工作流程

### 初始化流程

1. 应用启动，`LocaleProvider` 挂载
2. 从 `localStorage` 读取 `locale`
3. 如果没有保存的语言设置，检测浏览器语言
4. 设置默认语言（zh 或 en）
5. 更新 `<html lang="...">` 属性

### 切换语言流程

1. 用户点击语言切换器，选择新语言
2. `setLocale()` 更新状态
3. 保存到 `localStorage`
4. 更新 `<html lang="...">` 属性
5. 所有使用 `useTranslations` 的组件自动重新渲染
6. 显示新语言的文本

## 优势

### 对比 next-intl 路由方案

| 特性 | Context 方案（本项目） | next-intl 路由方案 |
|------|----------------------|-------------------|
| URL 变化 | ❌ 无需改变 URL | ✅ `/zh/`, `/en/` |
| SEO 友好 | ⚠️ 需要额外处理 | ✅ 天然支持 |
| 切换速度 | ⚡ 即时（无网络请求） | 🐢 需要导航 |
| 实现复杂度 | ✅ 简单 | ❌ 复杂（需要 middleware） |
| SSR 兼容 | ✅ 完全兼容 | ⚠️ 需要特殊处理 |
| 用户体验 | ✅ 流畅 | ⚠️ 需要页面跳转 |

### 适用场景

**适合 Context 方案**:
- ✅ 后台管理系统
- ✅ SPA 应用
- ✅ 需要即时语言切换
- ✅ 对 SEO 要求不高

**适合路由方案**:
- ✅ 多语言内容网站
- ✅ 需要 SEO 优化
- ✅ 不同语言有不同内容

本项目采用 **混合方案**：
- 前台网站：可考虑使用路由方案（SEO 需要）
- 后台管理：使用 Context 方案（体验优先）

## 注意事项

### 1. 客户端渲染

所有使用 `useTranslations` 的组件必须添加 `'use client'` 指令：

```tsx
'use client';  // 必须添加

import { useTranslations } from '@/contexts/LocaleContext';
```

### 2. 服务端组件

如果需要在服务端组件中使用翻译，需要通过 props 传递：

```tsx
// ❌ 不能在服务端组件中使用
// import { useTranslations } from '@/contexts/LocaleContext';

// ✅ 在客户端组件中获取翻译，传递给服务端组件
<ClientComponent>
  <ServerComponent title={t('title')} />
</ClientComponent>
```

### 3. 翻译键不存在

如果翻译键不存在，会返回键名本身：

```tsx
t('nonexistent.key');  // 返回: "nonexistent.key"
```

同时会在控制台输出警告。

### 4. 保持翻译同步

确保 `zh.json` 和 `en.json` 的结构一致：

```json
// ✅ 正确 - 结构一致
// zh.json
{ "nav": { "home": "首页" } }

// en.json
{ "nav": { "home": "Home" } }

// ❌ 错误 - 结构不一致
// zh.json
{ "nav": { "home": "首页" } }

// en.json
{ "nav": { "title": "Home" } }  // key 不匹配
```

## 调试

### 查看当前语言

```tsx
const { locale } = useLocale();
console.log('当前语言:', locale);  // 'zh' 或 'en'
```

### 查看 localStorage

```js
// 浏览器控制台
localStorage.getItem('locale');  // 'zh' 或 'en'
```

### 强制设置语言

```js
// 浏览器控制台
localStorage.setItem('locale', 'en');
location.reload();  // 刷新页面
```

## 最佳实践

1. ✅ 所有用户可见文本都使用翻译
2. ✅ 按模块组织翻译，避免重复
3. ✅ 使用语义化的键名（如 `nav.home` 而不是 `nav.1`）
4. ✅ 保持中英文翻译同步更新
5. ✅ 在开发时及时测试两种语言

## 访问地址

- **前台网站**: `http://localhost:3000/`
- **后台管理**: `http://localhost:3000/admin`

点击右上角的语言切换器即可切换语言。

---

最后更新时间：2026-03-21
