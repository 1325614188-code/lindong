import { AppSection } from '../types';

export interface ProjectIntro {
  title: string;
  icon: string;
  image: string;
  bgGradient: string;
  description: string;
  principles: string[];
  needCredits: boolean;
}

export const projectIntroData: Record<AppSection, ProjectIntro> = {
  [AppSection.HOME]: {
    title: '美丽实验室',
    icon: '🏠',
    image: '',
    bgGradient: 'from-pink-500 to-rose-400',
    description: '美丽实验室主页',
    principles: [],
    needCredits: false
  },
  [AppSection.JADE_APPRAISAL]: {
    title: '翡翠智能鉴别',
    icon: '💎',
    image: '/images/jade-appraisal-intro.png',
    bgGradient: 'from-emerald-600 to-teal-500',
    description: '通过多维度微观视觉特征和手感声音数据，快速评估您的翡翠手镯或挂件的真伪、种水及整体品质等级。',
    principles: [
      '微距特征对比：深度分析翡翠表面天然的橘皮效应与人工酸蚀网纹。',
      '透光结构评估：分析晶体结构致密性，筛查漂白注胶及染色痕迹。',
      '声音手感协同：融合用户对碰撞声音和压手感的物理反馈提高精准度。'
    ],
    needCredits: true
  },
  [AppSection.TRY_ON_CLOTHES]: {
    title: 'AI 虚拟换衣',
    icon: '👕',
    image: '/images/try-on-intro.png',
    bgGradient: 'from-blue-600 to-indigo-500',
    description: '上传一张您的上半身照片和一件心仪衣服，AI 即可帮您瞬间完成虚拟换装，查看穿搭效果。',
    principles: [
      '智能人像分割：精准剥离原有人体轮廓与旧服饰，保留人脸和身材。',
      '光影重塑合成：根据原图的环境光和反光，将新衣服进行物理光影融合。',
      '自然褶皱模拟：生成符合人像姿势的衣褶与透视，呈现高拟真度穿搭图。'
    ],
    needCredits: true
  },
  [AppSection.ADVANCED_TRY_ON]: {
    title: 'AI 高级试衣',
    icon: '👗',
    image: '/images/try-on-intro.png',
    bgGradient: 'from-purple-600 to-indigo-500',
    description: '为您提供全身比例、精细褶皱适配和多种高级成衣款式的云端换装体验，感受时尚模特的搭配美学。',
    principles: [
      '三维骨骼定位：通过检测身体骨骼关节点，适配不同版型的衣服。',
      '质感无缝贴合：高保真模拟丝绸、棉麻、皮革等不同面料的垂坠感与质地。',
      '场景氛围融合：自动将人像与精美背景进行色调匹配，打造专业大片质感。'
    ],
    needCredits: true
  },
  [AppSection.TRY_ON_ACCESSORIES]: {
    title: 'AI 首饰佩戴',
    icon: '💎',
    image: '/images/try-on-intro.png',
    bgGradient: 'from-amber-500 to-rose-500',
    description: '为您的照片自动配戴精美的耳环、耳坠等配饰，多角度观察首饰与脸型、妆容的和谐度。',
    principles: [
      '面部关键点追踪：以超高精度定位耳垂及面部五官轮廓边界。',
      '透视与遮挡处理：计算耳坠挂载的角度以及头发和脖子的空间遮挡关系。',
      '金属与宝石光泽：高动态渲染金属的镜面反光及宝石的折射质感。'
    ],
    needCredits: true
  },
  [AppSection.HAIRSTYLE]: {
    title: 'AI 发型设计',
    icon: '💇',
    image: '/images/try-on-intro.png',
    bgGradient: 'from-fuchsia-600 to-pink-500',
    description: '换个发型换种心情！提供数十款男士/女士热门发型设计，帮您挑选最契合自己脸型的完美发型。',
    principles: [
      '发际线智能识别：精准捕捉您的脸型骨骼边界和额头线条。',
      '发丝级无缝衔接：让新发型的发丝与您的原生面部边缘自然过渡。',
      '发色动态叠色：提供多种流行染发色系的预览，展示真实的光泽效果。'
    ],
    needCredits: true
  },
  [AppSection.MAKEUP]: {
    title: 'AI 虚拟美妆',
    icon: '💄',
    image: '/images/try-on-intro.png',
    bgGradient: 'from-rose-500 to-pink-500',
    description: '一键尝试桃花妆、清冷风、白开水等多种流行妆容风格，探索最衬托您气质的美妆方案。',
    principles: [
      '五官轮廓细分：精准定位眉、眼、唇、腮红等上妆区域。',
      '空气感彩妆图层：采用柔和图层混合算法，上妆质感服帖，无生硬边界。',
      '肤质微调滤镜：提供磨皮、提亮和腮红晕染的精细调和，展现自然好气色。'
    ],
    needCredits: true
  },
  [AppSection.BEAUTY_SCORE]: {
    title: 'AI 颜值打分',
    icon: '✨',
    image: '/images/test-intro.png',
    bgGradient: 'from-rose-500 to-orange-400',
    description: '上传一张您的正面照片，AI 会从黄金三庭五眼比例、五官立体度及对称美学等维度为您进行趣味美学打分。',
    principles: [
      '黄金比例几何测算：精准测量额、鼻、下巴的三庭长度和眼距的五眼宽度。',
      '五官立体度分析：根据面部阴影分布评估鼻梁挺拔度及面部饱满度。',
      '美学对称评分：测算左右脸的对称比率，给出针对性的发型与妆容扬长建议。'
    ],
    needCredits: true
  },
  [AppSection.COUPLE_FACE]: {
    title: 'AI 夫妻相测评',
    icon: '👩‍❤️‍👨',
    image: '/images/test-intro.png',
    bgGradient: 'from-pink-500 to-indigo-400',
    description: '上传您与伴侣的正面照片，AI 将深度比对两张脸的骨骼契合度、五官神似度以及相似指数。',
    principles: [
      '骨骼轮廓比对：计算两个人的脸型弧度、颧骨及下颌线条的和谐度。',
      '五官排布神似分析：比对眼形、鼻翼宽度、嘴角弧度等微观特征的相似比率。',
      '表情神态关联度：提取两张脸的亲和感和神韵指数，综合计算情侣契合分值。'
    ],
    needCredits: true
  },
  [AppSection.TONGUE_DIAGNOSIS]: {
    title: '趣味舌诊分析',
    icon: '👅',
    image: '/images/test-intro.png',
    bgGradient: 'from-rose-600 to-orange-500',
    description: '通过中医传统“舌诊”望诊原理，智能识别您舌头的舌质颜色、舌苔薄厚与裂纹，科普对应的脏腑健康信息。',
    principles: [
      '舌体区域分割：自动从面部照片中提取出舌头主体的清晰边界。',
      '舌色与苔质识别：分析舌质是否偏红或偏淡，判断舌苔偏黄、偏白或剥落。',
      '脏腑反射映射：根据舌尖、舌中、舌根及舌侧的异常状况，科普对应的中医脏腑反射区知识。'
    ],
    needCredits: true
  },
  [AppSection.FACE_COLOR]: {
    title: '面色中医分析',
    icon: '👤',
    image: '/images/test-intro.png',
    bgGradient: 'from-orange-500 to-amber-500',
    description: '分析面部额头、脸颊及眼周的肤色色泽状态，根据中医面色理论科普您的气血盈亏和日常食疗调理方案。',
    principles: [
      '多点肤色色差测算：收集面部核心九区的色值，排除光线干扰提取主色调。',
      '面部润泽度评估：通过高光点识别皮肤光泽度，辨别偏白、偏黄或偏青的气血指向。',
      '个性化调理食疗：根据面色特征，自动生成科学温和的中医食疗与作息科普。'
    ],
    needCredits: true
  },
  [AppSection.FACE_READING]: {
    title: '传统面相学',
    icon: '🔮',
    image: '/images/divination-intro.png',
    bgGradient: 'from-amber-600 to-yellow-500',
    description: '融合中国传统相术精髓，深度解析您的十二宫（命宫、财帛宫等）所对应的五官特质，洞察性格天性。',
    principles: [
      '面部十二宫自动定位：精准计算额头、眉宇、鼻尖、下颌在传统相术中的定位点。',
      '五官气场解析：根据双眉浓淡间距、眼形神采、鼻梁高低解析性格特质。',
      '国学开运建议：结合五行命盘，给出日常妆容和饰品开运的国学建议。'
    ],
    needCredits: true
  },
  [AppSection.FENG_SHUI]: {
    title: '居家摆设风水',
    icon: '🏡',
    image: '/images/divination-intro.png',
    bgGradient: 'from-yellow-700 to-amber-600',
    description: '上传您的客厅、卧室或办公室照片，国学大师 AI 将根据中国传统堪舆风水布局，提供房屋磁场改善和调整建议。',
    principles: [
      '格局与动线测算：分析照片中家具摆放的对称性、动线遮挡关系。',
      '光影气场流转：分析采光方向与室内暗角的风水五行能量分布。',
      '趋吉避凶化解：给出绿植、挂画、水晶等辟邪化煞或招财纳福的摆设建议。'
    ],
    needCredits: true
  },
  [AppSection.CALENDAR]: {
    title: '国学万年历',
    icon: '📅',
    image: '/images/divination-intro.png',
    bgGradient: 'from-amber-700 to-rose-800',
    description: '提供每日详细的干支纪时、吉凶宜忌、值神星曜、十二建除，以及精准的每日时辰吉凶查询。',
    principles: [
      '天干地支推演：严密推算每日的岁次、月建、日主及干支生克。',
      '宜忌神煞算法：结合协纪辨方书，整合德合、天德、日破等星曜宜忌推算。',
      '精准时辰吉凶：按十二时辰动态计算每个时辰的干支及吉凶方位（喜神/财神）。'
    ],
    needCredits: true
  },
  [AppSection.LICENSE_PLATE]: {
    title: '车牌能量吉凶',
    icon: '🚗',
    image: '/images/divination-intro.png',
    bgGradient: 'from-slate-700 to-indigo-800',
    description: '结合易经数理与五行生克，测算您的车牌号码所蕴含的能量场，助力出行平安、财源广进。',
    principles: [
      '易经八十一数理：将车牌数字提取并转换成易经吉凶卦象进行深度剖析。',
      '字母数理转换：根据国际标准音律及易经干支法则，将字母转化成数字频率。',
      '五行喜忌匹配：综合分析车主的出生五行，判断车牌是否对自身磁场有助益。'
    ],
    needCredits: true
  },
  [AppSection.MBTI_TEST]: {
    title: 'MBTI 职业性格测试',
    icon: '🧠',
    image: '/images/test-intro.png',
    bgGradient: 'from-indigo-600 to-violet-500',
    description: '基于卡尔·荣格的心理学理论，通过经典的心理选择题，深度测算您在 16 种性格类型（如 INTJ, ENFP）中的特质。',
    principles: [
      '四维度倾向性测量：测量外倾/内倾、感觉/直觉、思考/情感、判断/知觉的偏好程度。',
      '认知功能深度剖析：解析您大脑最底层的主导功能（Fe, Ni等），了解行为驱动力。',
      '多维度应用分析：为您提供详尽的职场沟通方式、适合岗位、恋爱关系及成长建议。'
    ],
    needCredits: false
  },
  [AppSection.DEPRESSION_TEST]: {
    title: '抑郁情绪自评',
    icon: '💔',
    image: '/images/test-intro.png',
    bgGradient: 'from-gray-700 to-slate-600',
    description: '采用国际标准 SDS 抑郁自评量表，用科学温和的题目帮助您了解自己近期的心理压力与抑郁情绪风险。',
    principles: [
      '国际标准量表支持：基于 Zung 氏抑郁自评量表（SDS），保证测试具有科学临床背书。',
      '身心双重维度评估：包含精神情感症状和躯体障碍症状（睡眠、胃口等）双重测量。',
      '智能压力缓释指南：评估风险分值，提供定制的心灵舒缓策略及心理干预提醒。'
    ],
    needCredits: true
  },
  [AppSection.MARRIAGE_ANALYSIS]: {
    title: '八字合婚测评',
    icon: '💍',
    image: '/images/divination-intro.png',
    bgGradient: 'from-red-600 to-rose-500',
    description: '输入男女双方的生辰八字，深度推算两个命盘的神煞配对、五行互补性及未来的感情运势。',
    principles: [
      '日柱天合地合匹配：比对男女双方日干和日支的生克刑冲合害关系。',
      '五行流通互补度：计算两张命盘喜忌五行的盈亏平衡性，看双方是否互旺。',
      '大运同步分析：预测未来十年的婚姻大运，提供日常相处和规避矛盾的国学秘诀。'
    ],
    needCredits: true
  },
  [AppSection.WEALTH_ANALYSIS]: {
    title: '八字财运剖析',
    icon: '💰',
    image: '/images/divination-intro.png',
    bgGradient: 'from-amber-600 to-red-600',
    description: '根据您的出生时辰进行排盘，定位命局中的财星与十神格，推算一生的财富多寡及起步大运。',
    principles: [
      '财星与食伤格定位：分析命盘中正财、偏财、食神、伤官的强弱与流通。',
      '喜用神财富大运：定位八字喜忌用神，推算什么时候迎来财富大运爆发期。',
      '守财与投资建议：解析您适合的理财风格（稳健/激进），指出破财神煞的化解方案。'
    ],
    needCredits: true
  },
  [AppSection.AI_EYE_DIAGNOSIS]: {
    title: '中医智能眼部望诊',
    icon: '👁️',
    image: '/images/test-intro.png',
    bgGradient: 'from-cyan-600 to-blue-500',
    description: '上传一张清晰的单眼白部分的照片，AI 将基于中医眼诊“五轮学说”原理，识别眼丝颜色和分布，科普脏腑状态。',
    principles: [
      '眼部瞳孔及眼白分割：自动提取出巩膜（眼白）的清晰高分辨率子图。',
      '巩膜血管纹理及色泽识别：分析红丝、黄斑、黑点的形态与走向。',
      '中医五轮器官反射：按照眼白映射肺、眼角映射心、瞳孔映射肾等，提供日常养生科普建议。'
    ],
    needCredits: true
  },
  [AppSection.EQ_TEST]: {
    title: 'EQ 情商科学测评',
    icon: '🤝',
    image: '/images/test-intro.png',
    bgGradient: 'from-emerald-500 to-sky-500',
    description: '测评您在社交沟通、情绪自我管理、同理心及逆境复原力等情商核心维度上的综合能力。',
    principles: [
      '情商核心五维度评定：包含自我察觉、情绪调控、自我激励、感同身受与人际技巧。',
      '情商瓶颈定位剖析：帮您找出在职场或两性亲密关系中情商短板的具体行为习惯。',
      '高情商进阶处方：针对您的得分类型，提供沟通模板和情绪脱敏的实用训练指南。'
    ],
    needCredits: true
  },
  [AppSection.IQ_TEST]: {
    title: 'IQ 逻辑脑力测评',
    icon: '🧠',
    image: '/images/test-intro.png',
    bgGradient: 'from-violet-600 to-fuchsia-600',
    description: '包含多组高水准的图形矩阵、逻辑推理、数字规律测验，评估您的瞬时空间想象力与数理逻辑脑力。',
    principles: [
      '图形矩阵时空测算：基于瑞文标准推理测验（SPM）模型设计，具有很高科学性。',
      '数字序列与抽象推理：评估左脑在数字关系识别和抽象逻辑上的转化速度。',
      '大脑优势版图分析：生成全面的脑力雷达图，评定您的逻辑记忆力与视觉空间能力。'
    ],
    needCredits: true
  },
  [AppSection.BIG_FIVE]: {
    title: '现代大五人格测试',
    icon: '🎭',
    image: '/images/test-intro.png',
    bgGradient: 'from-indigo-500 to-emerald-500',
    description: '大五人格是学术界应用最广泛、公信力最高的心理学特质模型，科学剖析您在外向性、宜人性等五个维度的特质。',
    principles: [
      '五大核心基因维度：外向性、宜人性、尽责性、神经质及开放性。',
      '细分人格亚因子探索：深度剖析每个核心大维度下的 6 个细分子因子（如焦虑度、同情心）。',
      '高度客观的科研级报告：生成最符合心理学规范的人格雷达百分比图与全面解析。'
    ],
    needCredits: true
  },
  [AppSection.ZI_WEI]: {
    title: '紫微斗数排盘',
    icon: '🌌',
    image: '/images/divination-intro.png',
    bgGradient: 'from-indigo-900 to-purple-800',
    description: '通过经典紫微斗数系统，为您自动进行十二宫（命宫、迁移宫等）精准排盘，详析人生的命盘运势格局。',
    principles: [
      '甲级星曜排盘推演：准确计算紫微、天府、七杀、贪狼等十四主星落宫。',
      '吉凶星辅助干涉：综合评估左辅右弼、文昌文曲、火星铃星等副星能量的交会干涉。',
      '命盘四化能量变动：解构化禄、化权、化科、化忌的四化飞星，分析流年运势契机。'
    ],
    needCredits: true
  },
  [AppSection.FACE_AGE]: {
    title: '相貌年龄分析',
    icon: '👶',
    image: '/images/test-intro.png',
    bgGradient: 'from-pink-400 to-rose-300',
    description: '分析面部轮廓流畅度、苹果肌饱满度及眼底皱纹，估算您在照片中看起来的真实外貌年龄。',
    principles: [
      '骨骼紧致度轮廓分析：通过人脸关键点拟合评估面部胶原蛋白饱满度和下巴轮廓流畅度。',
      '眼底与唇周纹理评估：细致扫描眼角及嘴角皮肤的细微纹理和紧实程度。',
      '维持年轻化美学策略：根据您的测试结果，提供定制的日常护肤及减龄穿搭建议。'
    ],
    needCredits: true
  },
  [AppSection.PERSONAL_NAMING]: {
    title: '易经姓名学个人起名',
    icon: '✍️',
    image: '/images/divination-intro.png',
    bgGradient: 'from-emerald-700 to-teal-600',
    description: '根据宝宝或您的生辰八字五行喜用神，结合三才五格及音形义，为您精心设计和推荐 5 个好听、有寓意的汉字名字。',
    principles: [
      '五行喜忌精准契合：排盘算出命局所缺与喜用神，用汉字的五行能量补益平衡。',
      '三才五格数理大吉：保证天格、人格、地格、总格、外格五格数理均为吉数。',
      '国潮诗词古风典籍：从《诗经》、《楚辞》、《易经》等国学古籍中提炼风雅字意。'
    ],
    needCredits: true
  },
  [AppSection.COMPANY_NAMING]: {
    title: '易经姓名学公司起名',
    icon: '🏢',
    image: '/images/divination-intro.png',
    bgGradient: 'from-slate-700 to-blue-800',
    description: '结合行业五行属性、企业经营特色以及法人/老板的生辰八字偏好，为您生成和推荐 5 个大气、好记的公司名字。',
    principles: [
      '行业属性五行匹配：根据科技（火）、商贸（水）、建筑（土）等行业五行特征进行匹配。',
      '法人财官命格支持：分析法人代表的喜用财官运势，选取能够提升财运及事业运的字眼。',
      '品牌传播声学测算：确保字号读音抑扬顿挫、易读易记，富有高端专业质感。'
    ],
    needCredits: true
  },
  [AppSection.APP_DOWNLOAD]: {
    title: '应用下载',
    icon: '📲',
    image: '',
    bgGradient: 'from-pink-500 to-rose-400',
    description: '美丽实验室客户端下载',
    principles: [],
    needCredits: false
  }
};
