# Euro 欧洲旅游操作业务系统（QUOS）完整理解与知识库

> 本文件旨在为 AI 助手（如 openclaw / DSH / Claude Code）提供完整的上下文支持，使其能够理解并执行欧洲地接社（DMC）行程的报价、系统录入（Tour Maker）、财务核算及相关自动化操作。所有规则均已根据用户实际操作和系统截图总结提炼。

## 1. 项目背景
该业务系统（日常称为 QUOS 或 KT 系统）是用于管理欧洲多国定制团、系列团及单团（Ad-hoc）的底层操作平台。核心目标是：根据客户需求（PDF行程/需求单），在系统中查找对应的供应商、酒店、车辆，将服务录入系统，并最终计算出成本和对外报价。

## 2. 系统核心页面与操作流 (Workflow)
操作员通常会遵循以下路径：
1. **Main Menu（主菜单）**: 搜索/新建团期，查看销售信息（如 PAX, Q Price, Agent 等）。
2. **Tour Configuration（行程配置）**: 设定总天数、路线（起始/结束城市）、区域（如 Western Europe）、导游语言等。
3. **Segment Details（分段详情）**: 将大行程切分为不同的操作段（如接机段、跨城段），并指定负责的办公室（DO）和操作员。
4. **Tour Maker（行程制作）**: 核心编辑器。按天（Day）录入具体的服务项目（如酒店、车辆、景点、餐饮），计算并核对成本。
5. **Services（服务详情）**: 点击 `Add Serv` 后弹出的详细表单，录入具体供应商、单价、时长、座位数等。

## 3. 核心业务规则（极其重要）

### 3.1 车辆双源规则（Dual Sourcing Rule）
系统对**长途车（LDC / MTC）**和**当地接驳车（Local MTC）**有严格的区分逻辑：
*   **接送机（Day 1 和 Day 最后一天）**：必须使用**当地供应商**（通常代码为 `KT STD MTC` 或 `TEITUR` 等），走 `APT/HTL` 或 `HTL/APT` 短途路线。
*   **跨国、跨城游览（中间天数）**：必须使用**长途大巴（Through Coach）**，且需要遵守特定区域的供应商锁定规则。

### 3.2 长线大巴（LDC）区域锁定规则
*   **西欧区域（Western Europe Planning）**：无论行程是否包含法国意大利，必须选择 **`IT ROM`（罗马）** 的 **`Through Coach (NGS)`** 供应商（日租金约650欧元，含司机餐费、大部分过路费和增值税，最高日里程375km）。
*   **中欧/德语区（德国、奥地利、捷克等）**：选择 **`DE BER`（柏林）** 的 **`Through Coach (NGS)`** 或 **`GLS`** 供应商（日租金约630-800欧元，需特别注意德国增值税或额外附加费）。
*   **北欧/冰岛区域**：长途大巴固定使用 **`SE STO`** 或冰岛的 **`TEITUR (LDC)`** 供应商。

### 3.3 打包计价逻辑
*   **车辆**：经常采用按天打包的方式（例如 `Reykjavik - 6 DAYS` 或 `Stockholm - 5 DAYS`），将其作为一个整体价格录入。如果跨越多国，需要在车辆条目下额外添加**空驶费（Empty Run）**、**司机过夜费（Pre/Post Night）**等。

### 3.4 各地特殊附加费自动生成规则
*   **德国**：每天必须自动添加 `Base - GERMAN VAT (APPLICABLE FOR NOW)`（如90.43欧元/天）。
*   **奥地利/东欧/北欧**：需添加路税（例如 `Austria ROAD TAX PAID BY DRIVER`、`Prague - CZ ROAD TAX`）。
*   **冰岛（特殊）：** 每个主要景区（如草帽山、黄金圈、黑沙滩、冰河湖）**必须单独添加**对应的 **`PARKING FEES ICELAND`** 项目，且按团（G）计价。同时必须添加每天司机的 `DRIVER LUNCH/DINNER ALLOWANCE` 餐补。
*   **跨海大桥/轮渡**：若经过厄勒海峡、大贝尔特桥或乘坐波罗的海渡轮（如 Viking Line），需添加对应的过桥费或轮渡票（OFR/DFR）。

## 4. 数据字典与系统缩写

### 4.1 Service Type（服务类型代码）
*   `DFR`: Day Ferry (白天轮渡)
*   `DTR`: Day Train (白天火车)
*   `ENT`: Entrance (景点门票)
*   `FLT`: Flight (国际/内陆航班)
*   `GUI`: Guide (导游)
*   `HTL`: Hotel (酒店)
*   `LUG`: Luggage (行李搬运)
*   `MTC`: Motor Coach (大巴/汽车，包含长途和短途)
*   `OFR`: Overnight Ferry (过夜轮渡)
*   `OTH`: Others (其他杂费，如保险、手工加价)
*   `OTR`: Overnight Trains (过夜火车)
*   `RST`: Restaurant (餐厅/餐食)

### 4.2 网格右侧标志位 (Grid Flags)
*   `P/G`: 计价方式。`P` = Per Person (按人头计费)，`G` = Per Group (按团计费)。**酒店、门票、轮渡多用P；车辆、包车、杂费多用G。**
*   `E`: Estimated (预估价格，未最终确认)。
*   `D`: Difficult period (旺季/困难时期，需尽早确认)。
*   `C`: Close out (切位/售罄/关团，不可更改)。
*   `M`: Must to have (必选项目)。
*   `P`: Prebooking (预控/预占，已向供应商占位)。
*   `S`: Semi-flexible (半灵活退改政策)。

### 4.3 业务常用名词
*   `PAX`: 客人人数。
*   `Free Pax`: 免票人员（如领队），通常不计入车/门票成本。
*   `Go-Ahead`: 客户确认行程可以开始操作。
*   `ITI`: Itinerary (行程单)。
*   `NET Price`: 成本价，供应商给我们的采购价。
*   `Mark-up`: 加价率（例如10%）。

## 5. 具体国别/区域酒店与供应商惯例

### 5.1 冰岛常用项目
*   **供应商**：`TEITUR (LDC)`, `PARKING FEES ICELAND`, `BLUE LAGOON`, `ELDING` (观鲸), `ICELANDIA` (飞机残骸摆渡车)。
*   **常用酒店参考（QUOS码）**：`FOSSHOTEL NUPAR`, `STRACTA`, `COURTYARD BY MARRIOTT REYKJAVIK`, `GRANDI BY CENTER HOTELS`, `BORGARNES`, `HOF`。
*   **地区代称**：冰岛行程通常将住宿地点标注为“西部小镇”、“南部小镇”等。实际对应的城市为：
    *   西部小镇：博尔加内斯 (Borgarnes)
    *   南部小镇：海拉 (Hella)、霍尔斯沃德吕尔 (Hvolsvöllur)、维克 (Vík)、教堂镇 (Kirkjubæjarklaustur)
    *   冰河湖附近：霍夫 (Hof)、赫本镇 (Höfn)

### 5.2 北欧常用项目
*   **供应商**：`KT STD MTC` (当地车), `THROUGH COACH (NGS/GLS)` (长途车), `VIKING LINE`, `TALLINK SILJA OY` (渡轮), `VR` (芬兰夜间火车)。
*   **特殊费用**：`Oslo ROAD TAX`, `Stockholm - Oslo Road Tax`, `Oresund bridge fee` (厄勒海峡大桥费), `Brimnes - Hardanger Bridge`。

### 5.3 西欧常用项目
*   **供应商**：`THROUGH COACH (NGS)` (罗马长途车), `KT STD MTC` (当地车)。
*   **酒店参考**：`NOVOTEL`, `HYATT PLACE`, `BW (Best Western)`, `COURTYARD BY MARRIOTT` 等。

## 6. 实操样例指引（基于用户提供的行程）

### 6.1 冰岛单国10日（REK/REK）
*   D1-D5: 使用 `TEITUR (LDC)` 打包录入 `Reykjavik - X DAYS`。每天逐一添加对应的景区停车费（`PARKING FEES ICELAND`）和司机餐补（`DRIVER LUNCH/DINNER ALLOWANCE`）。
*   每天添加对应的南部/西部酒店（如 `STRACTA`, `FOSSHOTEL` 等），使用 `P` 计价，通常带 `E` 标志。
*   录入蓝冰洞和冰河湖游船等体验项目。
*   D6-D7: 返回雷克雅未克市区，安排城市游，观鲸（`ELDING`），蓝湖温泉（`BLUE LAGOON`）。
*   D8-D9: 飞往斯德哥尔摩，切换使用 `KT STD MTC` 当地车，入住机场酒店。

### 6.2 北欧四国11日（含瑞典、挪威、丹麦、芬兰）
*   在瑞典段：使用 `THROUGH COACH (NGS)` 打包 `Stockholm - 5 DAYS`。
*   跨国段：添加挪威路税、挪威桥梁费、厄勒海峡大桥费（`Oresund bridge fee`），以及长时间使用的轮渡（`VIKING LINE`，区分 `OFR` 和 `DFR`）。

## 7. 自动化方向建议 (For AI Agents)
1.  **PDF解析规则**：解析客户PDF行程时，自动识别“落地/起飞城市”及“过夜城市”，并映射为系统的城市代码。
2.  **生成辅助清单**：根据行程自动罗列需要录入的项目，尤其提示“长途车选择规则”和“冰岛/北欧特殊税费”。
3.  **计算模型**：将 `LDC Summer 2026 CN ACTIVE.xlsx` 中的日租金、超里程费、空驶费等规则（如西欧650欧/天，375km限制，冰岛140欧/天等）内化为约束条件，用于自动校验录入数据。