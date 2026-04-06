
import React, { useState } from 'react';

interface MBTITestViewProps {
    onBack: () => void;
}

// MBTI 80道测试题目
const MBTI_QUESTIONS = [
    // E vs I (外向 vs 内向) - 20题
    { q: '在社交聚会中，你通常感到精力充沛', dimension: 'EI', direction: 'E' },
    { q: '你喜欢成为众人瞩目的焦点', dimension: 'EI', direction: 'E' },
    { q: '你更喜欢独处或与少数亲密朋友在一起', dimension: 'EI', direction: 'I' },
    { q: '你需要独处时间来恢复精力', dimension: 'EI', direction: 'I' },
    { q: '你喜欢主动认识新朋友', dimension: 'EI', direction: 'E' },
    { q: '你说话前会仔细思考', dimension: 'EI', direction: 'I' },
    { q: '你喜欢热闹的环境', dimension: 'EI', direction: 'E' },
    { q: '你更擅长倾听而非表达', dimension: 'EI', direction: 'I' },
    { q: '你在团队中经常发言', dimension: 'EI', direction: 'E' },
    { q: '你享受安静独处的时光', dimension: 'EI', direction: 'I' },
    { q: '你容易与陌生人攀谈', dimension: 'EI', direction: 'E' },
    { q: '你更喜欢书面沟通而非口头交流', dimension: 'EI', direction: 'I' },
    { q: '你喜欢参加大型派对或活动', dimension: 'EI', direction: 'E' },
    { q: '你在人群中待久了会感到疲惫', dimension: 'EI', direction: 'I' },
    { q: '你善于活跃气氛', dimension: 'EI', direction: 'E' },
    { q: '你更喜欢深入交流而非闲聊', dimension: 'EI', direction: 'I' },
    { q: '你会主动组织社交活动', dimension: 'EI', direction: 'E' },
    { q: '你觉得独自思考比讨论更有效', dimension: 'EI', direction: 'I' },
    { q: '你喜欢边说边想', dimension: 'EI', direction: 'E' },
    { q: '你倾向于先观察再行动', dimension: 'EI', direction: 'I' },
    // S vs N (感觉 vs 直觉) - 20题
    { q: '你更关注当下的实际情况', dimension: 'SN', direction: 'S' },
    { q: '你喜欢想象未来的可能性', dimension: 'SN', direction: 'N' },
    { q: '你注重细节和具体事实', dimension: 'SN', direction: 'S' },
    { q: '你容易看到事物的整体模式', dimension: 'SN', direction: 'N' },
    { q: '你更信任实际经验', dimension: 'SN', direction: 'S' },
    { q: '你喜欢探索新想法和理论', dimension: 'SN', direction: 'N' },
    { q: '你做事注重实用性', dimension: 'SN', direction: 'S' },
    { q: '你经常有突发的灵感', dimension: 'SN', direction: 'N' },
    { q: '你喜欢按既定方式做事', dimension: 'SN', direction: 'S' },
    { q: '你对抽象概念感兴趣', dimension: 'SN', direction: 'N' },
    { q: '你更相信看得见摸得着的东西', dimension: 'SN', direction: 'S' },
    { q: '你喜欢探索事物背后的深层含义', dimension: 'SN', direction: 'N' },
    { q: '你更擅长记住具体细节', dimension: 'SN', direction: 'S' },
    { q: '你常常展望遥远的未来', dimension: 'SN', direction: 'N' },
    { q: '你喜欢循序渐进地学习', dimension: 'SN', direction: 'S' },
    { q: '你喜欢思考"如果...会怎样"', dimension: 'SN', direction: 'N' },
    { q: '你注重事物的实际应用', dimension: 'SN', direction: 'S' },
    { q: '你容易发现事物之间的联系', dimension: 'SN', direction: 'N' },
    { q: '你更关心"是什么"而非"可能是什么"', dimension: 'SN', direction: 'S' },
    { q: '你喜欢隐喻和象征性的表达', dimension: 'SN', direction: 'N' },
    // T vs F (思考 vs 情感) - 20题
    { q: '做决定时你更依赖逻辑分析', dimension: 'TF', direction: 'T' },
    { q: '你很在意他人的感受', dimension: 'TF', direction: 'F' },
    { q: '你认为公平比和谐更重要', dimension: 'TF', direction: 'T' },
    { q: '你容易感受到他人的情绪', dimension: 'TF', direction: 'F' },
    { q: '你喜欢分析问题的利弊', dimension: 'TF', direction: 'T' },
    { q: '你更看重人际关系的和谐', dimension: 'TF', direction: 'F' },
    { q: '你能够客观地批评他人', dimension: 'TF', direction: 'T' },
    { q: '你经常赞美和鼓励他人', dimension: 'TF', direction: 'F' },
    { q: '你认为理性比感性更可靠', dimension: 'TF', direction: 'T' },
    { q: '你做决定时会考虑对他人的影响', dimension: 'TF', direction: 'F' },
    { q: '你更擅长解决技术问题', dimension: 'TF', direction: 'T' },
    { q: '你善于调解人际冲突', dimension: 'TF', direction: 'F' },
    { q: '你认为规则比例外更重要', dimension: 'TF', direction: 'T' },
    { q: '你在做决定时会考虑个人价值观', dimension: 'TF', direction: 'F' },
    { q: '你喜欢找出争论中的逻辑漏洞', dimension: 'TF', direction: 'T' },
    { q: '你容易对他人产生同情心', dimension: 'TF', direction: 'F' },
    { q: '你认为事实比感受更重要', dimension: 'TF', direction: 'T' },
    { q: '你更关心他人的需要', dimension: 'TF', direction: 'F' },
    { q: '你在批评时直言不讳', dimension: 'TF', direction: 'T' },
    { q: '你很难拒绝别人的请求', dimension: 'TF', direction: 'F' },
    // J vs P (判断 vs 感知) - 20题
    { q: '你喜欢按计划行事', dimension: 'JP', direction: 'J' },
    { q: '你喜欢保持选择的开放性', dimension: 'JP', direction: 'P' },
    { q: '你做事有条理有系统', dimension: 'JP', direction: 'J' },
    { q: '你享受临时起意的活动', dimension: 'JP', direction: 'P' },
    { q: '你喜欢事先做好规划', dimension: 'JP', direction: 'J' },
    { q: '你能很好地适应变化', dimension: 'JP', direction: 'P' },
    { q: '你喜欢尽早完成任务', dimension: 'JP', direction: 'J' },
    { q: '你经常在截止日期前才完成工作', dimension: 'JP', direction: 'P' },
    { q: '你的生活作息很规律', dimension: 'JP', direction: 'J' },
    { q: '你喜欢随心所欲地生活', dimension: 'JP', direction: 'P' },
    { q: '你会提前安排日程', dimension: 'JP', direction: 'J' },
    { q: '你更喜欢灵活应变', dimension: 'JP', direction: 'P' },
    { q: '完成任务给你带来满足感', dimension: 'JP', direction: 'J' },
    { q: '你喜欢同时进行多项任务', dimension: 'JP', direction: 'P' },
    { q: '你的物品摆放整齐有序', dimension: 'JP', direction: 'J' },
    { q: '你觉得规则可以灵活变通', dimension: 'JP', direction: 'P' },
    { q: '你喜欢有明确的目标', dimension: 'JP', direction: 'J' },
    { q: '你享受探索过程中的不确定性', dimension: 'JP', direction: 'P' },
    { q: '你常常列清单来管理任务', dimension: 'JP', direction: 'J' },
    { q: '你更喜欢顺其自然', dimension: 'JP', direction: 'P' },
];

// MBTI 类型描述
const MBTI_DESCRIPTIONS: Record<string, { 
    title: string; 
    traits: string; 
    careers: string; 
    industries: string; 
    earning: string;
    detailedReport: string;
    entrepreneurship: string;
    careerAdvice: string;
}> = {
    'INTJ': { 
        title: '建筑师', 
        traits: '独立、战略性思维、极高标准', 
        careers: '首席战略官、系统架构师、投资分析师', 
        industries: '高新科技、对冲基金、战略咨询', 
        earning: '💰💰💰💰💰 顶级，善于通过精密的逻辑规划长期财富。',
        detailedReport: 'INTJ 是最独立、最具策略性的人格类型。你拥有像棋手一样的预见力，不仅能洞察复杂系统的运作逻辑，更能设计出前瞻性的解决方案。你往往能一眼看穿事物间的联系，追求效能的最大化，是对抗低效率的终结者。',
        entrepreneurship: '【创业基因】适合技术驱动型或知识产权类创业。建议方向：SaaS软件开发、硬科技研发、专业智库咨询。合伙人建议：寻找一位沟通能力强、善于资源对接的 ENXP 或 ENFJ，弥补你在社交推广上的短板。',
        careerAdvice: '你的核心竞争力在于深度思考与系统设计。避坑建议：不要沉溺于过度的细节完美主义，学会与普通同事的“平庸心态”达成契解，避免因过于傲慢而导致团队孤立。'
    },
    'INTP': { 
        title: '逻辑学家', 
        traits: '分析能力强、创新、非传统', 
        careers: '科研专家、数据科学家、独立游戏开发、哲学家', 
        industries: '人工智能、学术研究、创意技术', 
        earning: '💰💰💰💰 较高，专业深度决定财富上限。',
        detailedReport: '作为逻辑学家，你是典型的“思想建筑师”。你对理论和逻辑完整性有近乎执着的追求。你喜欢挑战复杂且未定义的难题，不屑于遵循陈规冗余的流程。你的大脑是一个持续运转的实验场，不断在解构与重构世界。',
        entrepreneurship: '【创业基因】适合轻资产、高脑力成本的创业。建议方向：AI 算法服务、内容付费平台、高端技术诊断。合伙人建议：极度需要一个执行力极其强悍、能把你的想法“接地气”并推向市场的 ESTJ 或 ENTJ。',
        careerAdvice: '利用你的分析天賦。注意：你容易因为“想太多”而错过执行的最佳时机。学会用“最小可行性产品 (MVP)”思维来推动落地，而不是等系统做到 100% 完美才行动。'
    },
    'ENTJ': { 
        title: '指挥官', 
        traits: '天生领导力、果断、目标导向', 
        careers: '企业高管、大型项目负责人、律师、特许经营商', 
        industries: '商业领袖、金融创服、法律政务', 
        earning: '💰💰💰💰💰 顶级，天生的现金流掌控者。',
        detailedReport: '你代表着意志力与效率的巅峰。你不仅能看到宏大蓝图，更有能力带领千军万马将蓝图变现。你享受竞争，在压力环境中反而能爆发出惊人的指挥才能，是极少数能兼顾战略与执行的“六边形解析”。',
        entrepreneurship: '【创业基因】适合规模化、资源整合型创业。建议方向：品牌孵化、平台经济、资本运作。合伙人建议：你需要一个细心、能稳定后方的 ISFJ 或 INFP 来中和团队内的强硬氛围，提升文化粘度。',
        careerAdvice: '警惕过于强势而造成的精英傲慢。多听取基层意见，有时候“慢一点”反而能走得更远。多通过情绪价值的释放来构建追随者体系。'
    },
    'ENTP': { 
        title: '辩论家', 
        traits: '创新、发散性思维、口才卓越', 
        careers: '创始人、营销创意总监、风险投资家、脱口秀演员', 
        industries: '广告公关、互联网创业、传媒娱乐', 
        earning: '💰💰💰💰 极具爆发力，善于发现处于蓝海的商机。',
        detailedReport: '你是思维的推翻者与重建者。你热爱智力博弈，总能从意想不到的角度切入并解决问题。枯燥的重复性劳动是你的天敌，而充满变数和新鲜刺激感的领域才是你的主战场。',
        entrepreneurship: '【创业基因】适合先锋、跨界、高迭代型创业。建议方向：新媒体矩阵、元宇宙概念应用、全案营销策划。合伙人建议：急需一位做事有始有终、注重细节落地的 ISTJ 担任运营骨干，防止你的创意虎头蛇尾。',
        careerAdvice: '你的核心武器是创意和洞察力。建议通过深耕某一特定领域来积累权重，而不是在多个浅层机会间反复横跳。'
    },
    'INFJ': { 
        title: '提倡者', 
        traits: '极具深度、同情心理想主义、使命感', 
        careers: '人生教练、写作专家、NGO领袖、心理医生', 
        industries: '心理健康、精神教育、非营利组织', 
        earning: '💰💰💰 稳健，偏好通过社会价值的创造来带动财富。',
        detailedReport: '只有 1% 的人口属于 INFJ。你是敏感且深刻的预言家，外表温和但内心有一套不可逾越的信仰。你渴望帮助他人发现潜力，并致力于让世界变得更美好，是极具领袖气质的理想主义者。',
        entrepreneurship: '【创业基因】适合社区共创、社会企业、知识博主类创业。建议方向：身心疗愈工作室、高质量文化出版、在线教育体系。合伙人建议：寻找一位理性的、擅长成本核算与数据管理的 INTJ 或 ESTP。',
        careerAdvice: '保护你的情感能量。学会区分“他人的事”和“自己的责任”，避免因为共情能力过强而导致职业倦怠。'
    },
    'INFP': { 
        title: '调停者', 
        traits: '极富想象力、高度利他、追求意义', 
        careers: '自由插画师、小说创作者、景观设计、公益项目', 
        industries: '文化创意、自媒体、社会服务', 
        earning: '💰💰💰 差异大，艺术/创意天赋若得变现则收入颇丰。',
        detailedReport: '你是寻找生命火光的诗人。你活在自己丰富的精神世界中，对他人的不幸感同身受。你追求工作的灵魂契合度，如果你做的事并不符合你的价值观，你会感到极大的痛苦。',
        entrepreneurship: '【创业基因】适合小而美、艺术驱动或个人IP类创业。建议方向：独立设计品牌、非虚构写作工作室、小众手工工坊。合伙人建议：寻找一位懂市场规律、能够帮你处理繁杂商务流程的 ESTJ 合伙人。',
        careerAdvice: '学会面对现实的碰撞。在职场中不要把批评过于个人化，提升你的抗压性和目标导向思维，能让你的才华更好地发光。'
    },
    'ENFJ': { 
        title: '主人公', 
        traits: '极强感染力、责任感、社交大师', 
        careers: '企业教练、公关部VP、教育集团负责人、主持人', 
        industries: '教育培训、公共关系、大型组织管理', 
        earning: '💰💰💰💰 较高，优秀的人际资本能转化为极高市值。',
        detailedReport: '你是照亮团队的火炬。你不仅懂得如何激励人心，更具备整合各方利益、达成共识的卓越才能。你天生就是领导者，能敏锐觉察并满足人群的需求。',
        entrepreneurship: '【创业基因】适合服务型、社群型、领导类创业。建议方向：高端咨询培训、MCN机构、人力资源外包。合伙人建议：你需要一个专注硬技术、沉稳冷静的 INTP 或 ISTP 来作为你的技术后勤支撑。',
        careerAdvice: '不要过度承载他人的期待。学会拒绝和排序，不要为了维系团队和谐而牺牲掉最终的盈利目标。'
    },
    'ENFP': { 
        title: '竞选者', 
        traits: '热情、跨界才华、自由灵魂', 
        careers: '产品创新官、编剧、旅游博主、公关经理', 
        industries: '媒体传播、活动策划、创意咨询', 
        earning: '💰💰💰 有很强的吸金磁场，但管理财富能力波动较大。',
        detailedReport: '你是停不下来的创意散发机。每一个新念头都能让你热血沸腾。你善于建立联系，无论是在人际网络中还是在不同的知识领域间，你都能如鱼得水地穿梭。',
        entrepreneurship: '【创业基因】适合潮流、跨界、轻资产创业。建议方向：潮玩设计、活动派对品牌、新锐独立工作室。合伙人建议：极度需要一个性格稳重、财务把关严苛的 ISFJ 或 ISTJ 来守住你的钱袋子。',
        careerAdvice: '坚持下去！你最缺的不是好想法，而是“完成”一件事的能力。在开始下一个“大计划”前，先结清手头的尾数。'
    },
    'ISTJ': { 
        title: '物流师', 
        traits: '务实、高度可靠、制度守护者', 
        careers: '财务总监、物流运营官、法官、质量管理', 
        industries: '银行金融、现代物流、法律制度', 
        earning: '💰💰💰💰 极其稳健，财富随职级提升而确定性增长。',
        detailedReport: '你是这个社会的基石。你尊重逻辑、事实与传统。你承诺的事情一定会做到，你设计的流程一定会有结果。在动荡的环境中，你是最能给团队安全感的人。',
        entrepreneurship: '【创业基因】适合标准化流程输出、管理型创业。建议方向：精细化代运营、工程监理、财税合规公司。合伙人建议：寻找一位敢于破旧立新的 ENTP 或 ENFP，为你的传统模式注入前沿创意（空气）。',
        careerAdvice: '尝试接受哪怕只有 80% 确信度的新事物。这个时代变化太快，有时候过度保守会让你错失转型的红利期。'
    },
    'ISFJ': { 
        title: '守卫者', 
        traits: '忠诚、细心周到、实干家', 
        careers: '医护主管、高管助理、儿童教育、行政主管', 
        industries: '医疗康养、教育服务、社区资源', 
        earning: '💰💰💰 收入稳定且有保障，是理财的一把好手。',
        detailedReport: '你是最温暖的后勤官。你不仅能把事情做得井井有条，更能照顾到周围人的情绪需求。你的成就感往往来自于“被需要”和“把具体的事做好”。',
        entrepreneurship: '【创业基因】适合利他型、高频服务型创业。建议方向：宠物康养、高端家政平台、月子会所。合伙人建议：你特别需要一位具备扩张野心的 ENTJ 或 ESTP 来推动业务规模化。',
        careerAdvice: '你的勤勉不应被利用。学会在职场中争取合理的利益分配，不要总是一个人默默承担了所有的琐碎却不敢开口邀功。'
    },
    'ESTJ': { 
        title: '总经理', 
        traits: '组织天才、结果导向、传统捍卫', 
        careers: '厂长、大区经理、警官、政府官员', 
        industries: '传统制造业、施工管理、政经执法', 
        earning: '💰💰💰💰 管理职位带来的现金流非常充沛。',
        detailedReport: '你是天生的执行官。你信仰规则、效率和清晰的层级。你无法忍受懒惰和含混不清，总能带头冲在前线并确保每个任务都按时交付。',
        entrepreneurship: '【创业基因】适合资源转化、实体、加工类创业。建议方向：工厂管理外包、垂直电商供应、物业管理。合伙人建议：你需要一个富有远见、能跳出框架思维的 INFP 或 INFJ 来帮你做企业灵魂设计。',
        careerAdvice: '提升情商弹性。在管理中尝试用“关怀”手段而不是仅仅依赖“纪律”手段，能让你在现代职场中更具领导吸引力。'
    },
    'ESFJ': { 
        title: '执政官', 
        traits: '乐于助人、极强共情、社交核心', 
        careers: '销售高管、大型活动策划、私人银行、幼教总监', 
        industries: '高端商服、教育慈善、酒店文旅', 
        earning: '💰💰💰💰 良好，人脉变现能力极其强大。',
        detailedReport: '你是天生的连接者。你享受社交，并能时刻照料所有人。由于你对规则的尊重和对他人的高度负责，你往往能成为团队中的粘合剂，口碑极佳。',
        entrepreneurship: '【创业基因】适合服务代理、高端定制、联盟类创业。建议方向：婚庆全案、康养连锁、社区团购平台。合伙人建议：寻找一位擅长数据分析和底层架构设计的 INTJ 或 ISTP。',
        careerAdvice: '不要为了迎合他人而自我牺牲。明确职业边界感，学会在关键时刻说“不”，保护你作为专业人士的价值。'
    },
    'ISTP': { 
        title: '鉴赏家', 
        traits: '灵活果敢、机械天才、实用主义', 
        careers: '专业技师、飞行员、特种警察、系统运维', 
        industries: '精密制造、硬件工程、危机处理', 
        earning: '💰💰💰💰 高技术壁垒带来极高时薪。',
        detailedReport: '你是天生的拆解师。你喜欢钻研事物是如何运作的，对突发危机有冷静且极其迅速的反应能力。你讨厌理论空谈，更愿意直接上手干活。',
        entrepreneurship: '【创业基因】适合技术作坊、硬件开发、特种服务创业。建议方向：自动化工作室、极客维修、私人定制器械。合伙人建议：你急需一位擅长讲故事、做市场宣发的 ENFJ 或 ESFJ 帮你把产品卖出去。',
        careerAdvice: '学会团队协作。你习惯单打独斗，但现代职场的大型战役通常需要协同作战。适当分享你的操作逻辑，而不是留给别人一个高冷的背影。'
    },
    'ISFP': { 
        title: '探险家', 
        traits: '极简艺术家、温柔敏锐、不羁', 
        careers: '珠宝设计师、化妆师、花艺师、宠物医生', 
        industries: '美学产业、艺术设计、时尚消费', 
        earning: '💰💰💰 具有极强的利基市场开发能力。',
        detailedReport: '你是捕捉瞬间美感的感性艺术家。你热爱自由，对色彩、声音和情感有极其敏锐的捕捉。虽然你外表安静，但内心充满了对生命的热情，是那种能给平凡生活增添光彩的人。',
        entrepreneurship: '【创业基因】适合审美主导、生活方式类创业。建议方向：小红书美学博主、精品咖啡店、插画衍生品牌。合伙人建议：你需要一个能帮你操心财务报表和税务合规的 ESTJ 商业伙伴。',
        careerAdvice: '你的敏感是天赋也是负担。学会控制情绪波动，在面临死板的 KPI 压力时，寻找一个属于自己的缓冲地带。'
    },
    'ESTP': { 
        title: '企业家', 
        traits: '行动派、观察敏锐、极具冒险神', 
        careers: '销冠、救火队、职业经纪人、对冲基金交易员', 
        industries: '金融博弈、娱乐营销、极限产业', 
        earning: '💰💰💰💰💰 高风险高回报，财富增长曲线极其陡峭。',
        detailedReport: '你是当下时刻的征服者。你不仅能敏锐发现机会，更有胆量在别人犹豫时先行一步。你认为实践是检验真理的唯一标准，在动态的、充满竞争的环境中表现最优。',
        entrepreneurship: '【创业基因】核心创业者体质。建议方向：风口导向型项目、短期爆发性贸易、竞争性体育产业。合伙人建议：寻找一个能帮你做长远规划、能够稳住阵脚进行“防守”的 INFJ 或 INTP。',
        careerAdvice: '沉下心来做一点长期的深度积累。你虽然能赚“快钱”，但只有深厚的技术和知识储备能让你实现从“商人”向“领域专家”的跨越。'
    },
    'ESFP': { 
        title: '表演者', 
        traits: '活力四射、生活艺术家、演艺大师', 
        careers: '艺人、时尚买手、活动策划、明星销售', 
        industries: '演艺经纪、时尚快消、旅游餐饮', 
        earning: '💰💰💰 主要依靠个人魅力和广泛社交进行创收。',
        detailedReport: '你是生活的舞台主角。你自带镁光灯，能让任何沉闷的场合瞬间变热。你崇尚活在当下，总能发现最有趣的玩乐方式并感染身边人。',
        entrepreneurship: '【创业基因】适合视觉化、体验驱动型创业。建议方向：网红餐厅、娱乐策划公司、直播带货。合伙人建议：你需要一个极致高效、能帮你盯着合同和法律细则的 INTJ 或 ISTJ。',
        careerAdvice: '学习一些基础的财务逻辑和管理知识。光凭魅力可以开局，但只有规则和数据能让你的事业持续运转。'
    },
};

const MBTITestView: React.FC<MBTITestViewProps> = ({ onBack }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [result, setResult] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const handleAnswer = (score: number) => {
        setAnswers(prev => ({ ...prev, [currentQuestion]: score }));
        if (currentQuestion < MBTI_QUESTIONS.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const calculateResult = async () => {
        // 计算各维度得分
        const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

        MBTI_QUESTIONS.forEach((q, idx) => {
            const answer = answers[idx] || 3;
            const weight = answer - 3; // -2 到 +2
            if (q.direction === 'E' || q.direction === 'S' || q.direction === 'T' || q.direction === 'J') {
                scores[q.direction as keyof typeof scores] += weight;
            } else {
                scores[q.direction as keyof typeof scores] += weight;
            }
        });

        // 确定类型
        const type =
            (scores.E > scores.I ? 'E' : 'I') +
            (scores.S > scores.N ? 'S' : 'N') +
            (scores.T > scores.F ? 'T' : 'F') +
            (scores.J > scores.P ? 'J' : 'P');

        setResult(type);
        setShowResult(true);
    };

    const progress = ((currentQuestion + 1) / MBTI_QUESTIONS.length) * 100;
    const allAnswered = Object.keys(answers).length === MBTI_QUESTIONS.length;

    if (showResult && result) {
        const desc = MBTI_DESCRIPTIONS[result] || MBTI_DESCRIPTIONS['INTJ'];
        return (
            <div className="p-6 flex flex-col gap-6 pb-12">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-2xl p-2 -ml-2">←</button>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">职业天赋测试报告</h2>
                </div>

                {/* 顶部核心类型卡片 */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-[40px] p-8 text-white text-center shadow-xl shadow-purple-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-3">Professional Talent Type</p>
                    <h1 className="text-6xl font-black mb-3 drop-shadow-md">{result}</h1>
                    <div className="inline-block px-6 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                        <span className="text-xl font-bold">{desc.title}</span>
                    </div>
                </div>

                {/* 1. 深度性格解析 */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-xl">🧠</div>
                        <h3 className="font-black text-gray-800">深度性格解析</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed text-justify">
                        {desc.detailedReport}
                    </p>
                </div>

                {/* 2. 职场竞争力与建议 */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-blue-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-xl">💼</div>
                        <h3 className="font-black text-gray-800">职场核心竞争力</h3>
                    </div>
                    
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase mb-1">性格天赋</p>
                            <p className="text-sm text-gray-700 font-medium">{desc.traits}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-gray-400 font-bold mb-1">推荐岗位</p>
                                <p className="text-xs text-gray-600 leading-relaxed font-bold">{desc.careers}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase mb-1">职场避坑与建议</p>
                            <p className="text-sm text-gray-600 leading-relaxed italic">
                                {desc.careerAdvice}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. 创业大航海 (特别板块) */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[32px] p-6 shadow-sm border border-amber-100 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-7xl opacity-10 rotate-12">⛵</div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-xl text-white shadow-lg shadow-amber-200">🚀</div>
                        <h3 className="font-black text-amber-900">创业建议与大计划</h3>
                    </div>
                    <p className="text-amber-800 text-sm leading-relaxed font-medium relative z-10">
                        {desc.entrepreneurship}
                    </p>
                    <div className="mt-4 pt-4 border-t border-amber-200/50 flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-[10px] text-amber-600 font-bold uppercase">赚钱潜力评估</p>
                            <p className="text-sm">{desc.earning.split('，')[0]}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] text-amber-600 font-bold uppercase">行业选择</p>
                             <p className="text-xs text-amber-900 font-bold">{desc.industries.split('、')[0]}...</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                        注意：本测试结果基于 MBTI 理论模型生成，旨在提供职业参考。个人发展受多种现实因素影响，请结合实际情况进行决策。
                    </p>
                </div>

                <button onClick={onBack} className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black shadow-xl active:scale-95 transition-all text-lg flex items-center justify-center gap-2">
                    <span>返回实验室首页</span>
                    <span className="text-xl">🏠</span>
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-2xl">←</button>
                <h2 className="text-xl font-bold">职业天赋测试</h2>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center">{currentQuestion + 1} / {MBTI_QUESTIONS.length}</p>

            {/* 题目 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm min-h-[120px] flex items-center justify-center">
                <p className="text-lg text-center font-medium text-gray-800">
                    {MBTI_QUESTIONS[currentQuestion].q}
                </p>
            </div>

            {/* 答案选项 */}
            <div className="flex flex-col gap-3">
                {[
                    { score: 5, label: '非常同意', color: 'bg-purple-500' },
                    { score: 4, label: '比较同意', color: 'bg-purple-400' },
                    { score: 3, label: '一般', color: 'bg-gray-400' },
                    { score: 2, label: '比较不同意', color: 'bg-pink-400' },
                    { score: 1, label: '非常不同意', color: 'bg-pink-500' },
                ].map(opt => (
                    <button
                        key={opt.score}
                        onClick={() => handleAnswer(opt.score)}
                        className={`w-full py-3 rounded-xl text-white font-bold transition-all ${opt.color} ${answers[currentQuestion] === opt.score ? 'ring-4 ring-offset-2 ring-purple-300' : ''}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* 导航按钮 */}
            <div className="flex gap-3">
                <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold disabled:opacity-50"
                >
                    上一题
                </button>
                {allAnswered ? (
                    <button
                        onClick={calculateResult}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold"
                    >
                        查看结果 ✨
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestion(prev => Math.min(MBTI_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentQuestion === MBTI_QUESTIONS.length - 1}
                        className="flex-1 py-3 rounded-xl border-2 border-purple-500 text-purple-500 font-bold disabled:opacity-50"
                    >
                        下一题
                    </button>
                )}
            </div>
        </div>
    );
};

export default MBTITestView;
