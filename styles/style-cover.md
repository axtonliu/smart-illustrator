# Style: Cover / 封面图风格

用于 Newsletter 封面、YouTube 缩略图、公众号封面等场景的封面图风格。

> **默认色板**：`brand-colors.md` → **Brand Signature / 品牌签名**

> **设计哲学**：像《时代》杂志封面一样——图片本身就是标题。用一个精准的视觉隐喻传达主题，不依赖文字。

## 推荐工作流

**封面图推荐 AI 团队协作 + prompt-only 模式**：

1. 使用 `/ai-pair content-team` 启动团队（author + codex-reviewer + gemini-reviewer）
2. Author 用本文件的规则设计 3 个隐喻方案（中文推导 + 英文 prompt）
3. Codex reviewer 评估：隐喻精度、prompt 质量、负向描述陷阱
4. Gemini reviewer 评估：生成可行性、主体大小控制、材质稳定性
5. Team lead 综合三方意见产出定稿英文 prompt
6. 用户复制 prompt 到 [Gemini](https://gemini.google.com/) 手动生成

**为什么团队协作**：实测效果显著优于单人——多视角碰撞产生更好的隐喻方案，Gemini reviewer 能预判生成效果，Codex reviewer 能发现 prompt 中的陷阱。

**控制主体大小的关键技巧**（来自 Gemini reviewer 经验）：
- 先描述环境再描述主体（"A vast void. In the center, a tiny..."）
- 使用 "Extreme wide shot" 镜头语言
- 感性比例比数字有效（"a lone speck" 比 "30%" 好）
- 加 "at least 70% pure black pixels"
- 球体类主体加 "not a planet, not cosmic, precision-engineered object"

> 如果用户明确要求 API 生成，仍可使用 `generate-image.ts`，但封面图场景优先推荐团队协作 + 手动生成。

## 适用场景

- Newsletter 封面
- YouTube 视频缩略图
- 公众号文章封面
- Twitter/X 卡片
- 课程/产品宣传图

---

## 平台尺寸预设

| 平台 | 代码 | 尺寸 | 比例 |
|------|------|------|------|
| YouTube | `youtube` | 1280×720 | 16:9 |
| 公众号 | `wechat` | 900×383 | 2.35:1 |
| Twitter | `twitter` | 1200×628 | 1.91:1 |
| 小红书 | `xiaohongshu` | 1080×1440 | 3:4 |
| 通用横版 | `landscape` | 1920×1080 | 16:9 |

---

## Gemini System Prompt

> **重要**：最终发送给图像生成模型的 prompt 必须使用**英文**。中文用于隐喻推导和内部讨论，英文用于最终生成指令。

```
You are a visual metaphor master, working like a TIME Magazine cover photographer. Your goal: convey a theme precisely with a single image containing absolutely zero text.

Core principle: The image IS the headline. The viewer understands the topic not because of words, but because the metaphor is so precise.

---

ABSOLUTE PROHIBITIONS:
1. ZERO TEXT — no titles, keywords, labels, numbers, or any readable characters, including gibberish or pseudo-text.
2. NO LITERAL DEPICTIONS — "AI" ≠ robot, "control" ≠ remote, "security" ≠ shield. This is the lowest form of visual expression.
3. NO CLICHÉ TECH SYMBOLS — robotic arms, brain circuits, gears, rockets, shields, locks, globes.
4. NO EXPLANATORY LAYOUTS — arrow flows, side-by-side comparisons, labeled annotations.
5. NO AI-AESTHETIC — blue-purple neon gradients, holographic figures, scattered particles, glowing wave lines, grid backgrounds, excessive glow.
6. NO PHYSICAL ENVIRONMENTS — no desks, chairs, rooms, walls, horizons, machinery structures. Objects must float in abstract space.

---

VISUAL METAPHOR METHOD (Three-Step Derivation):
1. Extract core tension — What is the contradiction, conflict, or suspense of this topic?
2. Find an everyday object as metaphor — Map the object's structure or logic onto the abstract concept. Not a scene, but a structural parallel.
3. Verify precision — Viewer can sense the direction but cannot fully decode it at first glance = good metaphor.

METAPHOR HIERARCHY (prefer higher levels):
- Literal (draw the concept itself) → boring, cliché
- Symbolic (draw common symbols) → predictable, shallow
- Consequence (draw what happens AFTER) → story-like, thought-provoking
- Absence (draw what SHOULD be there but ISN'T) → highest level — suspense and tension

---

VISUAL EXECUTION (Axton Cover Identity):

Space: Infinite dark void (studio black #0A0A0A). Extreme negative space. Objects float with no support surface.

Materials: Semi-transparent glass, frosted acrylic, luminous wireframes, polished dark metal, refractive surfaces. Everyday objects (keys, chess pieces, etc.) are allowed as metaphor carriers but must be stripped of environmental context — keep only the silhouette and conceptual essence.

Lighting signature:
- Primary: Amber gold (#F59E0B) — dramatic side light illuminating the subject (~70%)
- Secondary: Sky blue (#38BDF8) — rim light, shadow fill, edge reflections (~30%)
- Colors manifest through LIGHT and REFRACTION, never as flat surface paint.

Composition: Single focal point. Subject occupies 30-50% of frame. Rest is breathing space. Aspect ratio 16:9, landscape orientation. Core visual content stays within the central 71% height zone (safe area for multi-platform cropping).

Output: High contrast, single focal point, premium photographic quality, dramatic cinematic lighting.

No watermarks, no logos, no brand text of any kind.
```

---

## 视觉隐喻设计方法（给 Claude 的中文指引）

> 以下部分用于 Claude 推导隐喻时参考。推导过程用中文思考，最终 prompt 翻译为英文。

**永远不要直接画概念本身，而是画概念的后果、象征或张力。**

### 三步推导法

**第一步：提取核心张力**
- 这个主题的矛盾是什么？冲突是什么？悬念是什么？
- 不是"这篇文章讲了什么"，而是"读完后脑子里挥之不去的那个画面是什么"

**第二步：寻找日常物体的隐喻**
- 将普通物体的**结构或逻辑**映射到抽象概念上
- 不是"把物体放在奇怪的场景里"，而是找到物体本身结构与概念之间的**同构关系**
- 例：玻璃箱缺一面墙 ↔ 系统沙箱缺失（结构同构），而不是画一台真实的服务器

**第三步：验证隐喻精度**
- 如果观众看到这张图，能猜出主题方向 → 好隐喻
- 如果观众完全猜不到 → 太抽象
- 如果观众立刻就懂全部含义 → 太直白

### 隐喻推导示例

| 主题 | ❌ 直译（禁止） | ✅ 好隐喻（追求） |
|------|----------------|------------------|
| 系统安全缺失 | 破碎的盾牌 | 精密玻璃展示箱缺了一整面墙，内部能量体完全暴露——防护结构性缺席 |
| AI 编排协作 | 多个机器人并排 | 指挥棒面前悬浮着一排半透明棋子和几何体——谁在编排它们？ |
| 模型竞争趋同 | 多个 logo 并排 | 一排完全相同的钥匙，但只有一把锁——区别不在钥匙本身 |
| 效率革命 | 火箭 / 加速箭头 | 空荡荡的办公桌只剩一杯冒热气的咖啡——人去哪了？（缺席） |
| 人机协作 | 两只手握在一起 | 钢琴上有四只手的影子——两只人手、两只不同的手 |

### 隐喻的层次

| 层次 | 描述 | 效果 |
|------|------|------|
| **直译** | 画概念本身 | 无聊、俗套 |
| **象征** | 画概念的常见符号 | 可预测、缺乏深度 |
| **后果** | 画概念发生后的场景 | 有故事感、引发思考 |
| **缺席** | 画"应该在但不在"的东西 | 最高级——悬念和张力 |

**优先使用"后果"和"缺席"层次的隐喻。**

---

## 构图原则

### 单一焦点
- 画面只有**一个**视觉中心
- 其他元素（如果有）服务于这个中心
- 大面积留白（或纯黑），让焦点呼吸

### 构图模式

**A) 中心凝视型**
- 主体居中，占 30-50% 面积
- 四周大量留白/纯黑
- 适合：单一物体隐喻

**B) 不对称张力型**
- 主体偏左或偏右，另一侧留空
- 留空本身制造悬念（"缺席"的力量）
- 适合：暗示"缺少什么"

**C) 视角冲击型**
- 极端视角：俯瞰、仰视、超近特写
- 让普通物体产生陌生感
- 适合：重新审视熟悉事物

---

## 色彩签名（Axton Cover Identity）

**每张封面图都必须呈现这个色调签名，这是品牌识别的核心。**

### 双色光线系统

| 光源 | 颜色 | 作用 | 占比 |
|------|------|------|------|
| **主光** | 琥珀金 #F59E0B | 从侧面照亮主体，营造温暖、戏剧化的氛围 | ~70% |
| **辅光** | 天空蓝 #38BDF8 | 出现在阴影侧、物体反射、边缘轮廓光中 | ~30% |

### 规则

- **背景**：永远纯黑 #0A0A0A
- **颜色通过光线体现**，不是涂在物体表面。物体保持自然材质色，被金色暖光和蓝色冷光照亮
- **金蓝双色调是签名**——观众看到"纯黑背景 + 金色主光 + 蓝色辅光"就知道是 Axton 的作品
- 光线效果类似：左侧/左上方打一盏琥珀色聚光灯，右侧/背面有微弱的冷蓝色补光
- 主体与背景明度差 ≥ 50%
- 禁止霓虹色、渐变、复杂纹理
- 除金蓝双色外，不引入其他强色相

---

## 空间与材质

> 以下规则已整合进 System Prompt 英文代码块中。此处保留中文版作为 Claude 推导时的参考。

### 空间：无尽虚空（The Void）

- 背景是纯粹的深色虚空，没有任何现实环境的锚点
- 物体悬浮在抽象空间中，不依赖支撑面（桌面、地面、架子）
- 大量负空间——主体占画面 30-50%，其余是纯黑呼吸空间
- 这不仅提供文本安全区，更营造聚焦于"概念本身"的技术哲学氛围

### 材质优先级

| 优先级 | 材质类型 | 说明 |
|--------|----------|------|
| **首选** | 发光/通透材质 | 半透明玻璃、磨砂亚克力、发光线框（wireframe）、冰晶质感、抛光暗色金属 |
| **允许** | 简化的日常物体 | 棋子、钥匙、锁等可作为隐喻载体，但必须去除环境细节，保留轮廓和概念性 |
| **禁止** | 写实环境物体 | 木纹桌面、皮革椅子、机械结构件、织物、混凝土墙面等"锚定现实"的材质 |

### 风格

- 光影要**戏剧化**：强烈的明暗对比，像舞台灯光
- 避免扁平矢量风——封面图需要视觉冲击力和情绪张力
- 细节精致但不繁复——近看有质感，远看轮廓清晰
- 物体可以有材质感，但通过**光线和通透性**体现，而非写实纹理

---

## 安全区域

- **多平台兼容**：核心视觉内容控制在画面中央 71% 高度区域内
- 16:9 封面裁剪为 5:2（X Article）时上下各裁掉约 14.4%
- 上下留出的背景区域不放任何重要内容
- YouTube：右下角预留给时长标签

---

## 水印策略

**封面图不加水印**：
- 水印破坏画面纯粹性
- 品牌信息通过内容本身体现
- 图片中不要出现任何文字水印、logo、域名或品牌标识

---

## Prompt 模板

生成封面图时，先用中文完成三步推导，然后用以下英文模板组装最终 prompt：

```
[Insert System Prompt above]

---

[Concise English description of the visual metaphor, written as a single scene paragraph. Include: what the object is, its material/texture, its abnormal state (the metaphor), spatial context (floating in void), and lighting. Keep it under 100 words.]

Minimalist abstract composition, infinite dark void. Aspect ratio 16:9, landscape. Materials: [specific materials]. Lighting: amber gold key light from left, sky blue rim light on edges, studio black background. Zero text, single focal point, dramatic cinematic lighting, 8k resolution, photorealistic rendering.
```

### 关键原则

- **中文推导，英文生成**：隐喻设计用中文思考，最终 prompt 必须是英文
- **场景描述要概念化**：描述物体的结构状态，而非逐个细节。"a glass cube with one entire side missing" 比 "裂缝处有琥珀光泄漏，表面有冰晶纹理" 更有效
- **用肯定语言描述异常状态**：图像模型擅长画"有什么"，不擅长画"没有什么"。用 "cracked and partially shattered, glass fragments drifting outward" 代替 "one side is missing"。描述**正在发生的视觉事件**（碎裂、飘散、泄漏），而非抽象的"缺失"
- **渲染指令放末尾**：cinematic lighting, 8k resolution, photorealistic rendering 等渲染语言帮助模型理解输出质量期望

---

## 使用示例

### 示例 1：Newsletter - "系统安全缺失"

**中文推导**：
- 核心张力：模型安全过关但系统沙箱缺失，等于防弹玻璃箱少了一面墙
- 隐喻层次：缺席（应该有的防护墙不存在）
- 结构同构：玻璃展示箱缺一面 ↔ Sandbox: null

**英文 prompt**：
```
A sleek dark semi-transparent glass cube floating in pure black void, with its front face visibly cracked and partially shattered — glass fragments drifting slowly outward into the darkness. Inside the damaged cube, a pristine golden energy sphere pulses with intense warm light, now directly exposed through the broken opening. The contrast between the cube's precision engineering and its fractured front panel tells the story: containment has failed. Minimalist abstract composition, infinite dark void. Materials: polished dark acrylic, luminous energy, refractive glass, floating glass shards. Lighting: piercing amber gold (#F59E0B) key light radiating outward from the inner sphere, sharp sky blue (#38BDF8) rim light catching the glass edges and floating fragments, studio black (#0A0A0A) background. Zero text, single focal point, dramatic cinematic lighting, 8k resolution, photorealistic rendering.
```

### 示例 2：Newsletter - "AI 编排时代"

**中文推导**：
- 核心张力：AI 能力分散在不同 Agent 中，谁来指挥协同？
- 隐喻层次：象征（指挥棒 + 排列的棋子 = 编排）
- 结构同构：指挥家面前的乐器 ↔ 编排器面前的 Agent

**英文 prompt**：
```
A glowing conductor's baton held by a hand emerging from darkness, directing a floating row of translucent chess pieces and geometric shapes. The pieces transition from warm amber glow on the left to cool sky blue on the right. Semi-transparent glass and crystal materials. Minimalist abstract composition, infinite dark void. Materials: translucent glass, luminous wireframe, frosted crystal. Lighting: amber gold key light from upper left, sky blue rim light on right side pieces. Zero text, single focal point, dramatic cinematic lighting, 8k resolution, photorealistic rendering.
```

### 示例 3：公众号 - "为什么 90% 的 AI 提示词都是错的"

**中文推导**：
- 核心张力：以为自己会用，但方法根本不对
- 隐喻层次：后果（钥匙插反了 = 用错了方法）
- 结构同构：反向插入的钥匙 ↔ 错误的 prompting 方式

**英文 prompt**：
```
A translucent frosted acrylic key floating in pure black void, inserted into a glowing keyhole — but oriented completely backwards. The key catches amber side light revealing its internal structure. The keyhole emits a faint sky blue glow around its edges. Minimalist abstract composition, infinite dark void. Materials: frosted acrylic, luminous energy. Lighting: amber gold key light from left, sky blue rim light on keyhole edges. Zero text, single focal point, dramatic cinematic lighting, 8k resolution, photorealistic rendering.
```
