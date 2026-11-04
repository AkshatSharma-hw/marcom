/**
 * Legal, regulatory and language seed — Jurisdictions, LegalClauses,
 * GlossaryTerms.
 *
 * Clauses are matched to content by jurisdiction + locale + channel (+ optional
 * product category). They are versioned and superseded, never edited in place:
 * LGL-001 → LGL-002 demonstrates the supersession chain the compliance surface
 * reads.
 *
 * Jurisdiction → region mapping note: our operating regions are AMER / EMEA /
 * APAC only. EU, FR, KSA and GCC therefore all sit inside REG-EMEA and JP
 * inside REG-APAC; GLOBAL spans all three regions.
 *
 * Ids are binding per SEED_MANIFEST.md ("Spec alignment wave A").
 */

import type { Jurisdiction, LegalClause, GlossaryTerm } from '../types';

/* ------------------------------------------------------------------ */
/* Jurisdictions (6) — KSA, GCC, EU, FR, JP, GLOBAL                    */
/* ------------------------------------------------------------------ */

export const seedJurisdictions: Jurisdiction[] = [
  {
    id: 'JUR-KSA',
    code: 'KSA',
    name: 'Kingdom of Saudi Arabia',
    regionIds: ['REG-EMEA'],
    notes:
      'Arabic is the governing language: where an Arabic and an English version differ, the Arabic text prevails. Promotions and prize draws require Ministry of Commerce licensing before any channel goes live, and telecom claims fall under CST oversight.',
    createdAt: '2026-01-09T09:00:00Z',
    updatedAt: '2026-06-18T11:00:00Z',
  },
  {
    id: 'JUR-GCC',
    code: 'GCC',
    name: 'Gulf Cooperation Council states',
    regionIds: ['REG-EMEA'],
    notes:
      'Six-state bloc used for clauses that travel across the Gulf without KSA-specific licensing. Bilingual Arabic/English presentation is expected on packaging and print; per-state rules still override where they are stricter.',
    createdAt: '2026-01-09T09:00:00Z',
    updatedAt: '2026-05-04T10:30:00Z',
  },
  {
    id: 'JUR-EU',
    code: 'EU',
    name: 'European Union',
    regionIds: ['REG-EMEA'],
    notes:
      'Unfair Commercial Practices and consumer-information rules apply to every comparative or performance claim; substantiation must exist at the moment of publication, not on request. Investor communications additionally carry Market Abuse Regulation obligations.',
    createdAt: '2026-01-09T09:00:00Z',
    updatedAt: '2026-07-02T08:45:00Z',
  },
  {
    id: 'JUR-FR',
    code: 'FR',
    name: 'France',
    regionIds: ['REG-EMEA'],
    notes:
      'Sits inside the EU baseline and adds French-specific obligations: the Toubon law requires French on every commercial communication aimed at the domestic market, so an English-only asset is non-compliant however well substantiated. Environmental claims carry additional substantiation duties under the Climate and Resilience law, and "publicité" must be labelled as such on influencer content.',
    createdAt: '2026-01-09T09:00:00Z',
    updatedAt: '2026-07-02T08:45:00Z',
  },
  {
    id: 'JUR-JP',
    code: 'JP',
    name: 'Japan',
    regionIds: ['REG-APAC'],
    notes:
      'Premiums and Representations Act (景品表示法) governs superiority and comparative claims: substantiation must be producible within a statutory window on request, which is stricter in practice than a file-on-record standard. Telecom performance claims fall under MIC guidance, and prize promotions are capped by value relative to transaction size.',
    createdAt: '2026-01-09T09:00:00Z',
    updatedAt: '2026-06-30T10:15:00Z',
  },
  {
    id: 'JUR-GLOBAL',
    code: 'GLOBAL',
    name: 'Global default',
    regionIds: ['REG-AMER', 'REG-EMEA', 'REG-APAC'],
    notes:
      'The baseline applied everywhere unless a narrower jurisdiction supplies a stricter clause. Trademark attribution and performance-claim substantiation are global floors, never waived by a regional exception.',
    createdAt: '2026-01-09T09:00:00Z',
    updatedAt: '2026-04-20T12:15:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* Legal clauses (20) — LGL-001..LGL-020                               */
/* ------------------------------------------------------------------ */

export const seedLegalClauses: LegalClause[] = [
  /* --- Forward-looking statements ---------------------------------- */
  {
    // Superseded: kept on record so published material from H1 2026 still
    // resolves to the clause version that was in force at the time.
    id: 'LGL-001',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-EU',
    locale: 'en-GB',
    channelKinds: ['press', 'web', 'email'],
    text: 'This communication contains forward-looking statements regarding Aureon Group\'s plans, expectations and future performance. Such statements are not guarantees of future results and involve risks and uncertainties. Aureon Group undertakes no obligation to update them.',
    version: 1,
    effectiveFrom: '2026-01-01',
    createdAt: '2025-12-08T10:00:00Z',
    updatedAt: '2026-06-24T09:00:00Z',
  },
  {
    id: 'LGL-002',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-EU',
    locale: 'en-GB',
    channelKinds: ['press', 'web', 'email', 'social'],
    text: 'This communication contains forward-looking statements about Aureon Group\'s strategy, plans and expected performance. Actual results may differ materially from those expressed or implied, owing to factors outside the Group\'s control including market conditions, supply availability and regulatory change. These statements speak only as at the date of publication and Aureon Group undertakes no obligation to update or revise them, whether as a result of new information or otherwise.',
    version: 2,
    effectiveFrom: '2026-07-01',
    supersedesId: 'LGL-001',
    createdAt: '2026-06-24T09:00:00Z',
    updatedAt: '2026-06-24T09:00:00Z',
  },
  {
    id: 'LGL-003',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-KSA',
    locale: 'en-SA',
    channelKinds: ['press', 'web', 'email'],
    text: 'This communication contains forward-looking statements concerning Aureon Group\'s plans and expected performance in the Kingdom of Saudi Arabia. Such statements are not a guarantee of actual results and are subject to change. Where this English text and the Arabic version differ, the Arabic version prevails.',
    version: 1,
    effectiveFrom: '2026-03-01',
    createdAt: '2026-02-11T08:30:00Z',
    updatedAt: '2026-02-11T08:30:00Z',
  },
  {
    id: 'LGL-004',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-KSA',
    locale: 'ar-SA',
    channelKinds: ['press', 'web', 'email'],
    text: 'تتضمن هذه المادة بيانات تطلعية تتعلق بخطط مجموعة أوريون وتوقعاتها بشأن الأداء المستقبلي في المملكة العربية السعودية. وهذه البيانات ليست ضماناً للنتائج الفعلية، وقد تختلف النتائج اختلافاً جوهرياً نتيجة عوامل خارجة عن سيطرة المجموعة. ولا تتحمل المجموعة أي التزام بتحديث هذه البيانات بعد تاريخ نشرها. وفي حال وجود اختلاف بين النص العربي والنص الإنجليزي، يُعتد بالنص العربي.',
    version: 1,
    effectiveFrom: '2026-03-01',
    createdAt: '2026-02-11T08:35:00Z',
    updatedAt: '2026-02-11T08:35:00Z',
  },
  {
    id: 'LGL-013',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    channelKinds: ['press', 'web', 'email', 'social'],
    text: 'La présente communication contient des déclarations prospectives relatives à la stratégie, aux projets et aux performances attendues du groupe Aureon. Les résultats réels peuvent différer sensiblement de ceux exprimés ou sous-entendus, en raison de facteurs échappant au contrôle du groupe, notamment les conditions de marché, la disponibilité des approvisionnements et les évolutions réglementaires. Ces déclarations sont valables à la date de publication et le groupe Aureon n\'assume aucune obligation de les mettre à jour.',
    version: 1,
    effectiveFrom: '2026-07-01',
    createdAt: '2026-06-24T09:10:00Z',
    updatedAt: '2026-06-24T09:10:00Z',
  },
  {
    id: 'LGL-014',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-JP',
    locale: 'ja-JP',
    channelKinds: ['press', 'web', 'email'],
    text: '本資料には、アウリオン・グループの戦略、計画および業績見通しに関する将来予測の記述が含まれています。実際の業績は、市場環境、部材の供給状況、規制の変更など当グループの管理の及ばない要因により、これらの記述と大きく異なる可能性があります。これらの記述は公表日時点のものであり、当グループは新たな情報の取得その他の理由により、これらを更新する義務を負いません。',
    version: 1,
    effectiveFrom: '2026-07-01',
    createdAt: '2026-06-24T09:15:00Z',
    updatedAt: '2026-06-24T09:15:00Z',
  },

  /* --- Performance-claim substantiation ---------------------------- */
  {
    id: 'LGL-005',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    productCategory: 'smartphone',
    channelKinds: ['web', 'social', 'ads', 'email', 'print'],
    text: 'Performance figures are based on Aureon internal testing conducted in August 2026 on pre-production units under controlled conditions. Actual results vary with usage patterns, network conditions, ambient temperature and device settings. Battery and charging claims are measured from a fully discharged state using the supplied charger.',
    version: 1,
    effectiveFrom: '2026-06-01',
    createdAt: '2026-05-18T13:00:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'LGL-006',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-GCC',
    locale: 'ar-SA',
    productCategory: 'smartphone',
    channelKinds: ['web', 'social', 'ads', 'print'],
    text: 'تستند أرقام الأداء إلى اختبارات داخلية أجرتها مجموعة أوريون في أغسطس 2026 على وحدات ما قبل الإنتاج وفق ظروف مضبوطة. وقد تختلف النتائج الفعلية تبعاً لطريقة الاستخدام وظروف الشبكة ودرجة الحرارة المحيطة وإعدادات الجهاز. وتُقاس ادعاءات البطارية والشحن بدءاً من حالة تفريغ كامل وباستخدام الشاحن المرفق.',
    version: 1,
    effectiveFrom: '2026-06-01',
    createdAt: '2026-05-18T13:10:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'LGL-007',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-EU',
    locale: 'en-GB',
    productCategory: 'enterprise-network',
    channelKinds: ['web', 'email', 'event'],
    text: 'Comparative and performance claims relating to GridWorks platforms are substantiated by benchmark testing held on file and available to customers and regulators on request. Results reflect the reference architecture described in the accompanying documentation and are not a warranty of performance in any specific environment.',
    version: 1,
    effectiveFrom: '2026-04-01',
    createdAt: '2026-03-20T09:20:00Z',
    updatedAt: '2026-03-20T09:20:00Z',
  },
  {
    id: 'LGL-015',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    productCategory: 'smartphone',
    channelKinds: ['web', 'social', 'ads', 'email', 'print'],
    text: 'Les performances annoncées reposent sur des tests internes réalisés par Aureon en août 2026 sur des unités de préproduction, dans des conditions contrôlées. Les résultats réels varient selon l\'usage, les conditions de réseau, la température ambiante et les réglages de l\'appareil. L\'autonomie et la vitesse de charge sont mesurées à partir d\'une batterie totalement déchargée, avec le chargeur fourni.',
    version: 1,
    effectiveFrom: '2026-06-01',
    createdAt: '2026-05-18T13:20:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'LGL-016',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-JP',
    locale: 'ja-JP',
    productCategory: 'smartphone',
    channelKinds: ['web', 'social', 'ads', 'email', 'print'],
    text: '性能値は、2026年8月にアウリオンが量産前の試作機を用いて管理された条件下で実施した社内試験に基づく参考値です。実際の性能は、ご利用状況、通信環境、周囲の温度および端末の設定により異なります。電池持ちおよび充電速度は、電池残量ゼロの状態から付属の充電器を使用して測定した値です。景品表示法に基づく表示の根拠資料は当社にて保管しています。',
    version: 1,
    effectiveFrom: '2026-06-01',
    createdAt: '2026-05-18T13:25:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },

  /* --- Trademark attribution --------------------------------------- */
  {
    id: 'LGL-008',
    kind: 'trademark',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    channelKinds: ['press', 'web', 'social', 'ads', 'print', 'email'],
    text: 'Aureon™, Volt™, Solara™ and GridWorks™ are trademarks of Aureon Group. The trademark symbol is required on the first prominent mention in any piece. All other trademarks are the property of their respective owners.',
    version: 2,
    effectiveFrom: '2026-02-01',
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-07-09T15:30:00Z',
  },
  {
    id: 'LGL-009',
    kind: 'trademark',
    jurisdictionId: 'JUR-GCC',
    locale: 'ar-SA',
    channelKinds: ['press', 'web', 'social', 'print'],
    text: 'أوريون™ وفولت™ وسولارا™ وجريدووركس™ علامات تجارية مملوكة لمجموعة أوريون. ويجب إدراج رمز العلامة التجارية عند أول ذكر بارز في أي مادة. وتبقى جميع العلامات التجارية الأخرى ملكاً لأصحابها.',
    version: 1,
    effectiveFrom: '2026-02-01',
    createdAt: '2026-01-15T11:10:00Z',
    updatedAt: '2026-01-15T11:10:00Z',
  },
  {
    id: 'LGL-017',
    kind: 'trademark',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    channelKinds: ['press', 'web', 'social', 'ads', 'print', 'email'],
    text: 'Aureon™, Volt™, Solara™ et GridWorks™ sont des marques du groupe Aureon. Le symbole doit figurer à la première mention visible dans chaque support. Toutes les autres marques demeurent la propriété de leurs titulaires respectifs.',
    version: 1,
    effectiveFrom: '2026-02-01',
    createdAt: '2026-01-15T11:20:00Z',
    updatedAt: '2026-01-15T11:20:00Z',
  },
  {
    id: 'LGL-018',
    kind: 'trademark',
    jurisdictionId: 'JUR-JP',
    locale: 'ja-JP',
    channelKinds: ['press', 'web', 'social', 'ads', 'print'],
    text: 'Aureon™、Volt™、Solara™、GridWorks™ はアウリオン・グループの商標です。各制作物において最初に目立つ形で言及する箇所には商標記号を付す必要があります。その他の商標はすべて各権利者に帰属します。',
    version: 1,
    effectiveFrom: '2026-02-01',
    createdAt: '2026-01-15T11:25:00Z',
    updatedAt: '2026-01-15T11:25:00Z',
  },

  /* --- Prize / promotion terms (KSA) ------------------------------- */
  {
    id: 'LGL-010',
    kind: 'regulatory',
    jurisdictionId: 'JUR-KSA',
    locale: 'ar-SA',
    channelKinds: ['web', 'social', 'SMS', 'ads', 'print'],
    text: 'هذه الحملة الترويجية مرخصة من وزارة التجارة في المملكة العربية السعودية، ولا يجوز نشرها قبل صدور رقم الترخيص. المشاركة متاحة للمقيمين في المملكة ممن أتموا الثامنة عشرة من العمر، ولا يُشترط الشراء للمشاركة. تسري الشروط والأحكام الكاملة المنشورة على الموقع الإلكتروني، ويُستثنى من المشاركة موظفو مجموعة أوريون ووكالاتها وأفراد أسرهم من الدرجة الأولى.',
    version: 1,
    effectiveFrom: '2026-05-01',
    createdAt: '2026-04-12T10:00:00Z',
    updatedAt: '2026-04-12T10:00:00Z',
  },
  {
    id: 'LGL-011',
    kind: 'regulatory',
    jurisdictionId: 'JUR-KSA',
    locale: 'en-SA',
    channelKinds: ['web', 'social', 'SMS', 'ads', 'print'],
    text: 'This promotion is licensed by the Ministry of Commerce of the Kingdom of Saudi Arabia and may not be published before the licence number has been issued. Entry is open to residents of the Kingdom aged 18 or over; no purchase is necessary to enter. Full terms and conditions are published on the campaign website. Employees of Aureon Group and its agencies, and their immediate families, are not eligible.',
    version: 1,
    effectiveFrom: '2026-05-01',
    createdAt: '2026-04-12T10:05:00Z',
    updatedAt: '2026-04-12T10:05:00Z',
  },

  /* --- Prize / promotion terms (France) ---------------------------- */
  {
    id: 'LGL-019',
    kind: 'regulatory',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    channelKinds: ['web', 'social', 'SMS', 'ads', 'print'],
    text: 'Jeu-concours gratuit sans obligation d\'achat, ouvert aux résidents majeurs de France métropolitaine. Le règlement complet est déposé et consultable gratuitement sur le site de l\'opération. Les collaborateurs du groupe Aureon et de ses agences, ainsi que leur famille directe, ne peuvent participer. Toute communication commerciale diffusée sur le marché français est rédigée en français conformément à la loi Toubon.',
    version: 1,
    effectiveFrom: '2026-05-01',
    createdAt: '2026-04-12T10:15:00Z',
    updatedAt: '2026-04-12T10:15:00Z',
  },

  /* --- Telecom regulatory statement -------------------------------- */
  {
    id: 'LGL-012',
    kind: 'regulatory',
    jurisdictionId: 'JUR-KSA',
    locale: 'ar-SA',
    productCategory: 'smartphone',
    channelKinds: ['web', 'print', 'press', 'ads'],
    text: 'جميع الأجهزة معتمدة من هيئة الاتصالات والفضاء والتقنية، وتعتمد سرعات الجيل الخامس على توافر تغطية المشغل في موقع الاستخدام ولا تضمنها مجموعة أوريون. وقد تختلف السرعات الفعلية باختلاف الشبكة والباقة والازدحام. ولا تمثل السرعات المعلنة التزاماً تعاقدياً بمستوى خدمة.',
    version: 1,
    effectiveFrom: '2026-06-15',
    createdAt: '2026-05-30T09:40:00Z',
    updatedAt: '2026-05-30T09:40:00Z',
  },
  {
    id: 'LGL-020',
    kind: 'regulatory',
    jurisdictionId: 'JUR-JP',
    locale: 'ja-JP',
    productCategory: 'smartphone',
    channelKinds: ['web', 'print', 'press', 'ads'],
    text: '表示の通信速度はベストエフォート方式による理論上の最大値であり、実際の速度を保証するものではありません。5G の利用可能エリアおよび速度は、通信事業者の提供状況、ご利用場所、回線の混雑状況により変動します。本製品は電波法に基づく技術基準適合証明を取得しています。',
    version: 1,
    effectiveFrom: '2026-06-15',
    createdAt: '2026-05-30T09:50:00Z',
    updatedAt: '2026-05-30T09:50:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* Glossary terms (18) — GLS-001..GLS-018                              */
/* ------------------------------------------------------------------ */

export const seedGlossaryTerms: GlossaryTerm[] = [
  {
    id: 'GLS-001',
    term: 'Volt 5G',
    approved: 'Volt 5G',
    avoid: ['Volt5', 'Volt-5G', 'VOLT 5g', 'the Volt five'],
    locale: 'en-US',
    createdAt: '2026-06-02T09:00:00Z',
    updatedAt: '2026-07-19T14:00:00Z',
  },
  {
    id: 'GLS-002',
    term: 'Aureon Group',
    approved: 'Aureon Group (first mention), Aureon thereafter',
    avoid: ['The Aureon Group', 'Aureon Corp', 'Aureon Inc.', 'AG'],
    locale: 'en-US',
    createdAt: '2026-06-02T09:05:00Z',
    updatedAt: '2026-06-02T09:05:00Z',
  },
  {
    id: 'GLS-003',
    term: 'pre-order',
    approved: 'pre-order',
    avoid: ['preorder', 'pre order', 'reserve now', 'pre-book'],
    locale: 'en-US',
    createdAt: '2026-06-02T09:10:00Z',
    updatedAt: '2026-07-24T09:30:00Z',
  },
  {
    id: 'GLS-004',
    term: 'zero trust',
    approved: 'zero trust (lowercase, no hyphen as a noun)',
    avoid: ['Zero-Trust', 'ZeroTrust', 'zero-trust security model'],
    locale: 'en-US',
    createdAt: '2026-06-02T09:15:00Z',
    updatedAt: '2026-06-02T09:15:00Z',
  },
  {
    id: 'GLS-005',
    term: 'trade-in',
    approved: 'trade-in (noun), trade in (verb)',
    avoid: ['tradein', 'trade-in-programme', 'buyback'],
    locale: 'en-GB',
    createdAt: '2026-06-02T09:20:00Z',
    updatedAt: '2026-06-02T09:20:00Z',
  },
  {
    id: 'GLS-006',
    term: 'battery life',
    approved: 'battery life (always paired with the substantiation footnote)',
    avoid: ['endless battery', 'unlimited battery', 'never needs charging'],
    locale: 'en-US',
    createdAt: '2026-06-02T09:25:00Z',
    updatedAt: '2026-08-04T10:10:00Z',
  },
  {
    // Arabic entries carry a Latin transliteration so English-language
    // reviewers can discuss the term without reading the script.
    id: 'GLS-007',
    term: 'أوريون',
    approved: 'أوريون',
    avoid: ['اوريون', 'أوريان', 'Aureon (بالحروف اللاتينية داخل نص عربي)'],
    locale: 'ar-SA',
    transliteration: 'Aureon',
    createdAt: '2026-06-05T08:00:00Z',
    updatedAt: '2026-07-19T14:05:00Z',
  },
  {
    id: 'GLS-008',
    term: 'فولت',
    approved: 'فولت ٥ جي',
    avoid: ['فولت 5G', 'ڤولت', 'فولت الخامس'],
    locale: 'ar-SA',
    transliteration: 'Volt 5G',
    createdAt: '2026-06-05T08:05:00Z',
    updatedAt: '2026-07-19T14:05:00Z',
  },
  {
    id: 'GLS-009',
    term: 'الطلب المسبق',
    approved: 'الطلب المسبق',
    avoid: ['الحجز المسبق', 'الشراء المبكر', 'البري أوردر'],
    locale: 'ar-SA',
    transliteration: 'al-talab al-musbaq',
    createdAt: '2026-06-05T08:10:00Z',
    updatedAt: '2026-06-05T08:10:00Z',
  },
  {
    id: 'GLS-010',
    term: 'الضمان',
    approved: 'الضمان المحدود',
    avoid: ['الكفالة', 'ضمان مدى الحياة', 'ضمان شامل'],
    locale: 'ar-SA',
    transliteration: 'al-daman al-mahdud',
    createdAt: '2026-06-05T08:15:00Z',
    updatedAt: '2026-06-05T08:15:00Z',
  },
  {
    // French entries need no transliteration — Latin script — but the avoid
    // list carries the anglicisms French reviewers most often have to strike.
    id: 'GLS-011',
    term: 'précommande',
    approved: 'précommande',
    avoid: ['pré-commande', 'pre-order', 'réservation', 'commande anticipée'],
    locale: 'fr-FR',
    createdAt: '2026-06-05T08:20:00Z',
    updatedAt: '2026-06-05T08:20:00Z',
  },
  {
    id: 'GLS-012',
    term: 'Volt 5G',
    approved: 'Volt 5G',
    avoid: ['Volt5', 'Volt 5 G', 'le Volt cinq', 'Volt-5G'],
    locale: 'fr-FR',
    createdAt: '2026-06-05T08:25:00Z',
    updatedAt: '2026-06-05T08:25:00Z',
  },
  {
    id: 'GLS-013',
    term: 'autonomie',
    approved: 'autonomie de la batterie (toujours accompagnée de la note de substantiation)',
    avoid: ['batterie infinie', 'autonomie illimitée', 'ne se recharge jamais'],
    locale: 'fr-FR',
    createdAt: '2026-06-05T08:30:00Z',
    updatedAt: '2026-08-04T10:10:00Z',
  },
  {
    id: 'GLS-014',
    term: 'garantie',
    approved: 'garantie limitée',
    avoid: ['garantie à vie', 'garantie totale', 'garantie illimitée'],
    locale: 'fr-FR',
    createdAt: '2026-06-05T08:35:00Z',
    updatedAt: '2026-06-05T08:35:00Z',
  },
  {
    // Japanese entries carry a Latin transliteration for the same reason the
    // Arabic ones do: reviewers who cannot read the script still need to be
    // able to discuss the term.
    id: 'GLS-015',
    term: 'アウリオン',
    approved: 'アウリオン',
    avoid: ['オーリオン', 'アウレオン', 'Aureon（日本語文中のラテン文字表記）'],
    locale: 'ja-JP',
    transliteration: 'Aureon',
    createdAt: '2026-06-05T08:40:00Z',
    updatedAt: '2026-07-19T14:05:00Z',
  },
  {
    id: 'GLS-016',
    term: 'ボルト5G',
    approved: 'ボルト5G',
    avoid: ['ヴォルト5G', 'ボルト・ファイブ', 'Volt5'],
    locale: 'ja-JP',
    transliteration: 'Volt 5G',
    createdAt: '2026-06-05T08:45:00Z',
    updatedAt: '2026-07-19T14:05:00Z',
  },
  {
    id: 'GLS-017',
    term: '予約注文',
    approved: '予約注文',
    avoid: ['先行予約', 'プレオーダー', '事前購入'],
    locale: 'ja-JP',
    transliteration: 'yoyaku chumon',
    createdAt: '2026-06-05T08:50:00Z',
    updatedAt: '2026-06-05T08:50:00Z',
  },
  {
    id: 'GLS-018',
    term: '保証',
    approved: '限定保証',
    avoid: ['永久保証', '完全保証', '無制限保証'],
    locale: 'ja-JP',
    transliteration: 'hosho',
    createdAt: '2026-06-05T08:55:00Z',
    updatedAt: '2026-06-05T08:55:00Z',
  },
];
