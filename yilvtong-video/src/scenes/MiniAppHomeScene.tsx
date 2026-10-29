import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const cssVariables = {
  primaryColor: '#1152d4',
  secondaryColor: '#F97316',
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  glassBg: 'rgba(248, 250, 252, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  textMain: '#1e293b',
  textSub: '#64748b',
  textPlaceholder: '#cbd5e1',
  borderColor: '#e2e8f0',
  dividerColor: '#f1f5f9',
  activeBg: '#f1f5f9',
  tagBg: '#eff6ff',
  tagText: '#2563eb',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
};

const categories = [
  {
    id: 'evidence',
    name: '证据搜集',
    desc: '全方位取证',
    bgColor: 'linear-gradient(135deg, #60a5fa 0%, #1e40af 100%)',
    shadowColor: 'rgba(37, 99, 235, 0.5)',
  },
  {
    id: 'channel',
    name: '维权途径',
    desc: '专业渠道',
    bgColor: 'linear-gradient(135deg, #34d399 0%, #047857 100%)',
    shadowColor: 'rgba(16, 185, 129, 0.5)',
  },
  {
    id: 'law',
    name: '法条详解',
    desc: '法律文库',
    bgColor: 'linear-gradient(135deg, #fbbf24 0%, #c2410c 100%)',
    shadowColor: 'rgba(217, 119, 6, 0.5)',
  },
  {
    id: 'topic',
    name: '维权专题',
    desc: '深度解析',
    bgColor: 'linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)',
    shadowColor: 'rgba(124, 58, 237, 0.5)',
  },
];

const articles = [
  {
    id: 1,
    title: '消费者权益保护法核心条款解读',
    category: '法条解读',
    date: '2024-01-15',
    summary: '深入解读消费者权益保护法的关键条款，帮助您了解自身权益...',
  },
  {
    id: 2,
    title: '网购退货纠纷维权指南',
    category: '维权攻略',
    date: '2024-01-12',
    summary: '网购遇到退货难题？本文为您提供详细的维权步骤和技巧...',
  },
];

const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 22L10 12L4 22" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M10 28C13.3137 28 16 25.3137 16 22H4C4 25.3137 6.68629 28 10 28Z" fill="white" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44 22L38 12L32 22" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M38 28C41.3137 28 44 25.3137 44 22H32C32 25.3137 34.6863 28 38 28Z" fill="white" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 6V42" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 12H24H38" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M38 42H24H10" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 38C30.3888 38 38 30.3888 38 21C38 11.6112 30.3888 4 21 4C11.6112 4 4 11.6112 4 21C4 30.3888 11.6112 38 21 38Z" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M26.657 14.3431C25.2093 12.8954 23.2093 12 21.0001 12C18.791 12 16.791 12.8954 15.3433 14.3431" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M33.2216 33.2217L41.7069 41.707" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18L15 12L9 6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {active ? (
      <>
        <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="4" stroke="#135bec" fill="#135bec" d="M9 18v24h30V18L24 6 9 18Z"/>
        <path strokeLinecap="round" strokeWidth="4" stroke="#135bec" d="M9 42h30"/>
      </>
    ) : (
      <>
        <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="4" stroke="#94a3b8" d="M9 18v24h30V18L24 6 9 18Z"/>
        <path strokeLinejoin="round" strokeWidth="4" stroke="#94a3b8" d="M19 29v13h10V29H19Z"/>
        <path strokeLinecap="round" strokeWidth="4" stroke="#94a3b8" d="M9 42h30"/>
      </>
    )}
  </svg>
);

const DocumentIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {active ? (
      <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="4" stroke="#135bec" fill="#135bec" d="M10 6a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v38l-7-5-7 5-7-5-7 5V6Z"/>
    ) : (
      <path strokeLinejoin="round" strokeLinecap="round" strokeWidth="4" stroke="#94a3b8" d="M10 6a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v38l-7-5-7 5-7-5-7 5V6ZM18 22h12M18 30h12M18 14h12"/>
    )}
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinejoin="round" strokeWidth="4" stroke={active ? "#135bec" : "#94a3b8"} fill={active ? "#135bec" : "none"} d="M5.004 42.231a.78.78 0 0 0 .791.769h36.407a.78.78 0 0 0 .792-.769v-.918c.018-.277.055-1.657-.855-3.184-.574-.963-1.407-1.794-2.476-2.472-1.293-.82-2.938-1.413-4.928-1.77a29.236 29.236 0 0 1-3.002-.584c-2.632-.672-2.862-1.267-2.864-1.273a.763.763 0 0 0-.066-.169c-.022-.11-.075-.528.027-1.647.258-2.843 1.783-4.523 3.008-5.873.386-.425.751-.828 1.032-1.222 1.213-1.7 1.325-3.635 1.33-3.755a2 2 0 0 0-.087-.628c-.12-.37-.343-.6-.507-.77a2.874 2.874 0 0 1-.113-.12c-.012-.014-.044-.052-.015-.243.108-.705.172-1.295.203-1.857.056-1.002.099-2.5-.16-3.959a6.031 6.031 0 0 0-.172-.825c-.273-1.004-.711-1.862-1.32-2.57-.105-.115-2.653-2.8-10.05-3.35-1.023-.076-2.034-.035-3.03.016a4.39 4.39 0 0 0-.875.108c-.764.197-.968.681-1.021.952-.089.45.067.798.17 1.03.015.033.034.074.001.182-.171.266-.442.506-.717.733-.08.067-1.934 1.667-2.036 3.756-.275 1.589-.255 4.064.07 5.775.02.095.047.235.002.33-.35.313-.746.668-.745 1.478.004.082.117 2.016 1.33 3.717.28.394.645.796 1.03 1.221l.002.001c1.225 1.35 2.75 3.03 3.008 5.872.101 1.12.048 1.537.027 1.648a.758.758 0 0 0-.067.169c-.001.006-.23.599-2.85 1.27-1.512.387-3 .585-3.045.59-1.934.327-3.569.906-4.86 1.721-1.065.673-1.9 1.507-2.48 2.477-.928 1.55-.903 2.962-.89 3.22v.923Z"/>
  </svg>
);

const EvidenceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(0) invert(1)' }}>
    <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3"/>
    <circle cx="24" cy="24" r="8" stroke="white" strokeWidth="3"/>
    <line x1="24" y1="4" x2="24" y2="12" stroke="white" strokeWidth="3"/>
    <line x1="24" y1="36" x2="24" y2="44" stroke="white" strokeWidth="3"/>
    <line x1="4" y1="24" x2="12" y2="24" stroke="white" strokeWidth="3"/>
    <line x1="36" y1="24" x2="44" y2="24" stroke="white" strokeWidth="3"/>
  </svg>
);

const ChannelIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(0) invert(1)' }}>
    <path d="M24 4L4 14V34L24 44L44 34V14L24 4Z" stroke="white" strokeWidth="3" fill="none"/>
    <path d="M24 24L44 14" stroke="white" strokeWidth="3"/>
    <path d="M24 24L4 14" stroke="white" strokeWidth="3"/>
    <path d="M24 24V44" stroke="white" strokeWidth="3"/>
  </svg>
);

const LawIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(0) invert(1)' }}>
    <rect x="8" y="8" width="32" height="32" rx="4" stroke="white" strokeWidth="3" fill="none"/>
    <line x1="16" y1="18" x2="32" y2="18" stroke="white" strokeWidth="3"/>
    <line x1="16" y1="26" x2="28" y2="26" stroke="white" strokeWidth="3"/>
    <line x1="16" y1="34" x2="24" y2="34" stroke="white" strokeWidth="3"/>
  </svg>
);

const TopicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(0) invert(1)' }}>
    <path d="M16 22L10 12L4 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44 22L38 12L32 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="24" y1="6" x2="24" y2="42" stroke="white" strokeWidth="3"/>
    <line x1="10" y1="12" x2="38" y2="12" stroke="white" strokeWidth="3"/>
    <line x1="10" y1="42" x2="38" y2="42" stroke="white" strokeWidth="3"/>
  </svg>
);

const categoryIcons: Record<string, React.FC> = {
  evidence: EvidenceIcon,
  channel: ChannelIcon,
  law: LawIcon,
  topic: TopicIcon,
};

export const MiniAppHomeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const statusBarHeight = 44;
  const navBarContentHeight = 44;
  const navBarHeight = statusBarHeight + navBarContentHeight;
  const searchHeight = 56;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft Yahei", sans-serif',
      }}
    >
      <div
        style={{
          width: 375,
          height: 750,
          backgroundColor: cssVariables.pageBg,
          borderRadius: 32,
          overflow: 'hidden',
          boxShadow: '0 50px 100px rgba(0, 0, 0, 0.5)',
          opacity: phoneOpacity,
          transform: `scale(${phoneScale})`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: navBarHeight,
            background: cssVariables.glassBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: cssVariables.shadowSm,
            borderBottom: `0.5px solid ${cssVariables.glassBorder}`,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ height: statusBarHeight }} />
          <div
            style={{
              height: navBarContentHeight,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: cssVariables.primaryColor,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(17, 82, 212, 0.3)',
                }}
              >
                <LogoIcon />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 'bold',
                    color: cssVariables.textMain,
                    lineHeight: 1,
                  }}
                >
                  衣律通
                </span>
                <div
                  style={{
                    width: 1,
                    height: 14,
                    backgroundColor: cssVariables.borderColor,
                    margin: '0 8px',
                  }}
                />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: cssVariables.textSub,
                    lineHeight: 1,
                  }}
                >
                  首页
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: navBarHeight,
            left: 0,
            right: 0,
            zIndex: 99,
            backgroundColor: 'transparent',
            padding: '12px 20px',
          }}
        >
          <div
            style={{
              height: 44,
              backgroundColor: cssVariables.cardBg,
              border: `0.5px solid ${cssVariables.borderColor}`,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              boxShadow: cssVariables.shadowMd,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SearchIcon />
            </div>
            <span
              style={{
                fontSize: 14,
                marginLeft: 8,
                color: cssVariables.textPlaceholder,
                lineHeight: '44px',
              }}
            >
              搜索法条、案例或律师...
            </span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: navBarHeight + searchHeight + 8,
            left: 0,
            right: 0,
            bottom: 80,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0 20px' }}>
            <div
              style={{
                width: '100%',
                height: 160,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                marginBottom: 8,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  消费者权益保护法
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>
                  了解您的合法权益
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: cssVariables.primaryColor,
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: cssVariables.textPlaceholder,
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: cssVariables.textPlaceholder,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {categories.map((cat, index) => {
                const catDelay = 20 + index * 8;
                const catFrame = Math.max(0, frame - catDelay);
                const catOpacity = interpolate(catFrame, [0, 10], [0, 1], {
                  extrapolateRight: 'clamp',
                });
                const catScale = spring({
                  frame: catFrame,
                  fps,
                  config: { damping: 12, stiffness: 100 },
                });

                const IconComponent = categoryIcons[cat.id];

                return (
                  <div
                    key={cat.id}
                    style={{
                      width: 'calc(50% - 8px)',
                      borderRadius: 16,
                      padding: '24px 16px',
                      background: cat.bgColor,
                      boxShadow: `0 8px 20px ${cat.shadowColor}`,
                      opacity: catOpacity,
                      transform: `scale(${catScale})`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                        }}
                      >
                        <IconComponent />
                      </div>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: 1.4,
                        paddingLeft: 2,
                      }}
                    >
                      {cat.desc}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  marginTop: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 4,
                      height: 16,
                      backgroundColor: cssVariables.primaryColor,
                      borderRadius: 2,
                      marginRight: 6,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: cssVariables.textMain,
                    }}
                  >
                    热门推荐
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: cssVariables.primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span>查看全部</span>
                  <div style={{ marginLeft: 2, display: 'flex', alignItems: 'center' }}>
                    <ArrowRightIcon />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {articles.map((article, index) => {
                  const artDelay = 60 + index * 12;
                  const artFrame = Math.max(0, frame - artDelay);
                  const artOpacity = interpolate(artFrame, [0, 10], [0, 1], {
                    extrapolateRight: 'clamp',
                  });

                  return (
                    <div
                      key={article.id}
                      style={{
                        background: cssVariables.cardBg,
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: cssVariables.shadowMd,
                        opacity: artOpacity,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 120,
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6366f1',
                          fontSize: 12,
                        }}
                      >
                        📄 文章配图
                      </div>
                      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span
                            style={{
                              backgroundColor: cssVariables.tagBg,
                              color: cssVariables.tagText,
                              fontSize: 10,
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: 16,
                            }}
                          >
                            {article.category}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: cssVariables.textPlaceholder,
                              fontWeight: 500,
                            }}
                          >
                            {article.date}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 'bold',
                            color: cssVariables.textMain,
                            lineHeight: 1.4,
                          }}
                        >
                          {article.title}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: cssVariables.textSub,
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {article.summary}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: cssVariables.cardBg,
            borderTop: `0.5px solid ${cssVariables.borderColor}`,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingBottom: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: cssVariables.primaryColor }}>
            <HomeIcon active={true} />
            <span style={{ fontSize: 10, marginTop: 2 }}>首页</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: cssVariables.textSub }}>
            <DocumentIcon active={false} />
            <span style={{ fontSize: 10, marginTop: 2 }}>文书</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: cssVariables.textSub }}>
            <ProfileIcon active={false} />
            <span style={{ fontSize: 10, marginTop: 2 }}>我的</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
