// Navigation structure for the portfolio site
export const navigationData = {
  home: {
    id: 'home',
    type: 'page',
    title: 'Home',
    content: {
      name: 'Henry Allan',
      email: 'isthishenry@gmail.com',
      subtitle: 'motion, brand, generative design\n3d, vibe coding',
      current: 'current:\nthe collected works',
      past: 'past:\nvmgroupe\nkalshi\nmschf'
    }
  },
  mainMenu: [
    {
      id: 'work',
      title: 'Work',
      type: 'submenu',
      content: {
        title: 'Work',
        description: 'Selected projects and experiments',
        isGrid: true // Flag to render as video grid
      },
      submenu: [
        {
          id: 'expensify',
          title: 'Expensify',
          type: 'page',
          content: {
            title: 'Expensify',
            year: '2024',
            tags: '3D, Motion',
            description: 'Brand work for expensify in 3D and 2D. 24 assets for Barclays Center Nets takeover. Assets for Apple\'s F1 game and movie partnership. ',
            thumbnail: 'https://stream.mux.com/in8Ag9DadXfvZ200uuQ01nIU34ds02IGSybWlQdDu902jeY.m3u8',
            blocks: [
              { type: 'image', src: 'https://cdn.isthishenry.com/img/003_Expensify_Barclays-1.243830bd-2560.jpg', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/KrFqSeEg6sIXIJCk3UbScWfxLRGNMivTTLNZGwKCXtY.m3u8', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/005_Expensify_Barclays-5.0faf0436-2560.jpg', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/in8Ag9DadXfvZ200uuQ01nIU34ds02IGSybWlQdDu902jeY.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/Kr02R02jf7vo2zDkP7Za7OhiG3npWsXhhySCNbw3wz7Do.m3u8', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/007_Expensify_Exfy_buisnesscard.1164332f-1374.jpg', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/008_Expensify_exfy_helmet_v01_01png.7e59cdf8-1080.jpg', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/t5P4CIAxmO2ioPJif101jAnr8GajjCLg901GdiZ37iLVo.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/vuBa801GYW6O7KfQpRmkJsNjzrt02Z8Y8k4NTjbas00Df00.m3u8', colSpan: 6, colStart: 7 }
            ]
          }
        },
        {
          id: 'smokeye-hill',
          title: 'Smokeye Hill',
          type: 'page',
          content: {
            title: 'Smokeye Hill',
            year: '2026',
            tags: 'Visual Design, Motion, 3D',
            description: 'Brand identity work for Smokeye Hill, a whiskey company from Colorado.',
            thumbnail: 'https://cdn.isthishenry.com/img/011_Smokeye-Hill_BuisnessCardMock_v03.047b0ba3-2560.jpg',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/n6tLj8QUe8MGBtpu94h6bavMy8AZSX3koOb02tCCcmWA.m3u8', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/fryHYssssweNy1b71IcE02CaeRSd6usX01SmuKQ9m01NTY.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/KNe802VHzlTLAnGpBjTRdT2Sukfh1GTjvP3lQh6HWxyk.m3u8', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/1k6yBx1VlXl01dHeymk3Ugef7MKvbxSp02wgwH2AmjDGA.m3u8', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/JZmWRKfxYdhDl8q2AviDeWSXePoEuMtw5fb59pgYIyg.m3u8', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/2puyvLhQyxXpFpfRbjOB7srErHQNT2RSBuM67DNtB2M.m3u8', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/LFIpWZXE6hB7ON02PJ11Cyc6trA01aNIXLi00fCAfp4nio.m3u8', colSpan: 12, colStart: 1 }
            ]
          }
        },
        {
          id: 'welcome-jpeg',
          title: 'Welcome Jpeg',
          type: 'page',
          content: {
            title: 'Welcome Jpeg',
            year: '2025',
            tags: 'UI/UX, Vibecoding, 3D',
            description: 'Welcome Jpeg set the stage for elevated content curation on instagram for it\'s 1.5m followers. I was brought on to design and develop their creative agency website. Wireframed in figma, built with claude code.',
            thumbnail: 'https://stream.mux.com/Hsr1NWQzr801C7K1Ih02oyDG8fXI00fhxWKMVgTwssbJoY.m3u8',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/Hsr1NWQzr801C7K1Ih02oyDG8fXI00fhxWKMVgTwssbJoY.m3u8', colSpan: 12, colStart: 1 },
              { type: 'text', content: 'The site features a custom hero image system built with javascript. We scraped hundreds of images from the Welcome instagram feed and built a tool that can be dynamically updated and refined via control panel, bridging the gap between dev, design, and the client.', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/q22CKIyfd9heneslv402PzE3Vwib02kkAWLHF00wYF2QMQ.m3u8', colSpan: 12, colStart: 1 }
            ]
          }
        },
        {
          id: 'worksuite',
          title: 'Worksuite',
          type: 'page',
          content: {
            title: 'Worksuite',
            year: '2025',
            tags: '3D',
            description: 'Worksuite needed a set of unique images to represent their numerous product offerings. We created a boutique set of renders for their website relaunch. Created in partnership with Reunion.',
            thumbnail: 'https://cdn.isthishenry.com/img/021_Worksuite_Worksuite_Stacks_v06_01.7c1d49e3-2560.jpg',
            baseUrl: 'https://cdn.isthishenry.com/worksuite/',
            blocks: [
              { type: 'image', src: 'https://cdn.isthishenry.com/img/021_Worksuite_Worksuite_Stacks_v06_01.7c1d49e3-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/022_Worksuite_Worksuite_Stacks_v06_01.1.4e0308bd-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/023_Worksuite_Worksuite_Stacks_v06_02.2a03d1a0-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/024_Worksuite_Worksuite_Stacks_v06_02.1.aa28b3cc-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/025_Worksuite_Worksuite_Stacks_v06_03.67b8c1db-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/026_Worksuite_Worksuite_Stacks_v06_03.1.a23a8307-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/027_Worksuite_Worksuite_Stacks_v06_04.f6a43ef3-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/028_Worksuite_Worksuite_Stacks_v06_04.1.03e771ce-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/029_Worksuite_Worksuite_Stacks_v06_05.951f0e47-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/030_Worksuite_Worksuite_Stacks_v06_05.1.90b06a41-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/031_Worksuite_Worksuite_Stacks_v06_06.6aee7966-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/032_Worksuite_Worksuite_Stacks_v06_06.1.8ec87c4f-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/033_Worksuite_Worksuite_Stacks_v06_07.50c98597-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/034_Worksuite_Worksuite_Stacks_v06_07.1.b0732c4e-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/035_Worksuite_Worksuite_Stacks_v06_08.45c88582-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/036_Worksuite_Worksuite_Stacks_v06_08.1.67160ee4-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/037_Worksuite_Worksuite_Stacks_v06_09.243bdef7-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/038_Worksuite_Worksuite_Stacks_v06_09.1.eb586b26-2560.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/039_Worksuite_Worksuite_Stacks_v06_10.36f044e1-2560.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/040_Worksuite_Worksuite_Stacks_v06_10.1.d84469f9-2560.jpg', colSpan: 6, colStart: 7 }
            ]
          }
        },
        {

          id: 'it-cosmetics',
          title: 'IT Cosmetics',
          type: 'page',
          content: {
            title: 'IT Cosmetics',
            year: '2024',
            tags: '3D, Art Direction, Brand',
            description: 'Year-round 3D production — environment design, lighting, lookdev, rendering. Lead editor, holiday 2024 campaign.',
            thumbnail: 'https://cdn.isthishenry.com/itcosmetics/capaing24gif.gif',
            clickToExpand: true,
            baseUrl: 'https://cdn.isthishenry.com/itcosmetics/',
            blocks: [
              { type: 'image', src: 'capaing24gif.gif', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/042_IT-Cosmetics_022025_ithol_blackfriday_sideangle_v01.4534c968-500.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/043_IT-Cosmetics_022125_ithol_blackfriday_KV9_v06.5c1c97ec-500.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/044_IT-Cosmetics_022125_ithol_blackfriday_08_v09.6a5aa8ec-500.jpg', colSpan: 12, colStart: 1 },
              
              { type: 'image', src: 'https://cdn.isthishenry.com/img/045_IT-Cosmetics_022125_ithol_blackfriday_v04.4b7d66b7-500.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/046_IT-Cosmetics_071624_It_Helix_BoxArt_2025_lightpink_DayTonight_v04.7efcef75-500.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/047_IT-Cosmetics_0718_itD11_helix_glasspedastal_v01.da2a534f-500.jpg', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/048_IT-Cosmetics_0720_ITD11_sssRibbons_pedastal_v10.c95e6038-500.jpg', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/049_IT-Cosmetics_itcos_testing.bb6be72e-500.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/050_IT-Cosmetics_120524_ITC_KV2_Henry_v3_02.b951d4c0-500.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/051_IT-Cosmetics_ITC_D11_tech_image_v010_anim2.aa63cb95-500.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/052_IT-Cosmetics_ITC_editorial_25_KV_01_Charm-Transform-023.0d6ce9ba-500.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/053_IT-Cosmetics_IT_D11_Shot4_drips_v10_nobigdrip.d23f52c5-500.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/054_IT-Cosmetics_IT_D11_Shot8_24hr_BBUE_v014.5a29cbe5-500.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/055_IT-Cosmetics_IT_d11_PH1_KV1_v001_set_001_HP_0005.6b5d0492-500.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/056_IT-Cosmetics_IT_d11_PH1_KV1_v001_set_001_HP_0007.ade33810-500.jpg', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/057_IT-Cosmetics_ithol25_Boxes_Shelves_v01.f95a077e-500.jpg', colSpan: 6, colStart: 1 }
            ]
          }
        },
        {
          id: 'kalshi',
          title: 'Kalshi',
          type: 'page',
          content: {
            title: 'Kalshi',
            year: '2024',
            tags: '3D, Motion, VFX',
            description: 'Conceptualized and produced VFX for Kalshi\'s top markets. Strategy through 3D/2D execution — millions of impressions.',
            thumbnail: 'https://stream.mux.com/f5vtGWVQZd02Kgd02r4HwICWCfDn8oqgBU4O9WMPgcgrw.m3u8',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/q97imqukswur7A6SUNYKB2xxDA02c2syWmCuUp5sUSME.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/f5vtGWVQZd02Kgd02r4HwICWCfDn8oqgBU4O9WMPgcgrw.m3u8', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/PSI2PduAJiVm02TEmEwagxL6TegBR3DNANYFL8YHlUl8.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/cc7qsUJrIJPi02HI6ZsY0001fSttpCZ4APcGCwXBWQJpwY.m3u8', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/011QbHTnWYhO000200XVVXVwDEgQk1Gqu7eCrDAs6DzJqf00.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/iTnYTP4Zq8lsAktybJitHwSssKLVHgXsz9ev49T20001M.m3u8', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/p6E922niL01BKcR5FEiej4f6JQDyZTdzM2lvqsdHSzHk.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/tQ2IVLTLBxGH6WLe7wpOuD9HMnrpF00dE5JjlPHk8Oic.m3u8', colSpan: 6, colStart: 7 }
            ]
          }
        },
        {
          id: 'mschf',
          title: 'MSCHF',
          type: 'page',
          content: {
            title: 'MSCHF',
            year: '2024',
            tags: '3D, Motion, Brand',
            description: 'Led strategy and production of 30 animations over 8 months for MSCHF\'s 2 Million Dollar Puzzle.',
            thumbnail: 'https://stream.mux.com/bR8XEyloDGeeryGXn2vuulf02z94IzISOXry4NZgnu02c.m3u8',
            baseUrl: 'https://cdn.isthishenry.com/MSCHF/',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/jWCBaNhvrYfCW33KOB6pbZDx1Db3ipUYersjVQcxX00s.m3u8', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/bR8XEyloDGeeryGXn2vuulf02z94IzISOXry4NZgnu02c.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/SAycEdRlpK11fqNNhtXXBuUB5fd00Rv2XjMq4trySTbg.m3u8', colSpan: 6, colStart: 7 },
              //{ type: 'video', src: '02_4x5_lifestyle.mp4', colSpan: 6, colStart: 1 },
              //{ type: 'video', src: '02_float_pieces0000-0061.mp4', colSpan: 6, colStart: 7 },
              //{ type: 'video', src: '02_puzren10001-0250.mp4', colSpan: 6, colStart: 1 },
              //{ type: 'video', src: '02_scanrender0001-0062.mp4', colSpan: 6, colStart: 7 },
              
              { type: 'video', src: 'https://stream.mux.com/cx01t02cVdiIgxKfrQeXM01IZUgy4Wd1o34AMFdUxPsXcI.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/HllnT6En83017EcSjl7V9H7ubkyVxLvH00pJB01ZPlMOX4.m3u8', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/dYNwBlLmEeSyuLe6DiwLAoP02OWhfd02LN01PPi13Cug5o.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/AnD9AXK5a0200N01A89MJlc4Pt2whvVPany5je1eIuzoT00.m3u8', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/2TzJHFRjAQaQr5phBS9TbBMdhumXKWz2TQ5HMVDlA500.m3u8', colSpan: 12, colStart: 1 },
              //{ type: 'video', src: '05_bundledrop0001-0061.mp4', colSpan: 6, colStart: 7 },
              //{ type: 'image', src: '05_darkpileofpuzzle.png', colSpan: 6, colStart: 1 },
              //{ type: 'video', src: '05_ed2seq.mp4', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/074_MSCHF_06_STILL3_4x5.714b2e57-1080.jpg', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/img/075_MSCHF_06_STILL5_glow_4x5.8b680272-1080.jpg', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://stream.mux.com/W6cVkxFp02sEnFdTUqjQh6KUABSfAX5Sgk5HrShsdDSA.m3u8', colSpan: 12, colStart: 1 },
              //{ type: 'image', src: '06_halloween_still1_4x5.png', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/91kaHCdi015dWoxqVpYui2cl1Eeid02MllrywlpdbxWtc.m3u8', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/31xLmu2qVG71gCaIUvDueT30088uHmSVxo6RezxGmQ8E.m3u8', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://stream.mux.com/HyYbXdt3KCwwIXcfR18gDKfdy5nE1ak1q1fScLP5BLM.m3u8', colSpan: 6, colStart: 7 },
              
              //{ type: 'image', src: '07_2Dadstyle_thispuzchangelife_blue.png', colSpan: 6, colStart: 1 }
            ]
          }
        },
        {
          id: 'more',
          title: 'More',
          type: 'submenu',
          content: {
            title: 'More',
            description: 'Additional projects and experiments',
            isGrid: true
          },
          submenu: [
            {
              id: 'iraq-war-civ-casualties',
              title: 'Iraq War Civ Casualties',
              type: 'page',
              content: {
                title: 'Iraq War Civ Casualties',
                year: '2026',
                tags: 'Motion',
                description: '',
                thumbnail: 'https://stream.mux.com/nj4UExCuTB1hYYQN02w4jvfnz02SgUu3502J02Sn9SryrP8.m3u8',
                blocks: [
                  { type: 'video', src: 'https://stream.mux.com/nj4UExCuTB1hYYQN02w4jvfnz02SgUu3502J02Sn9SryrP8.m3u8', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/081_Iraq-War-Civ-Casualties_Screenshot-2026-04-30-135149.1b7a1916-2083.jpg', colSpan: 12, colStart: 1 }
                ]
              }
            },
            {
              id: 'guardrails-ai',
              title: 'Guardrails AI',
              type: 'page',
              content: {
                title: 'Guardrails AI',
                year: '2026',
                tags: '3D',
                description: '3D illustration for Guardrails AI',
                thumbnail: 'https://cdn.isthishenry.com/img/082_Guardrails-AI_Guardrails_blogimage_01.0fe1773e-2000.jpg',
                baseUrl: 'https://cdn.isthishenry.com/guardrails/',
                blocks: [
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/082_Guardrails-AI_Guardrails_blogimage_01.0fe1773e-2000.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/083_Guardrails-AI_Guardrails_blogimage_03.7dbc7407-2000.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/084_Guardrails-AI_Guardrails_blogimage_04.ef1d08f2-2000.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/085_Guardrails-AI_Guardrails_blogimage_05.4183a900-2000.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/086_Guardrails-AI_Guardrails_blogimage_06.15a9e2a6-2000.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/087_Guardrails-AI_Guardrails_blogimage_07.ad8cac63-2000.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/088_Guardrails-AI_Guardrails_blogimage_08.5e3ffa2e-2000.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/089_Guardrails-AI_Guardrails_blogimage_09.26951e4e-2000.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/090_Guardrails-AI_Guardrails_blogimage_10.33d2e33c-2000.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/091_Guardrails-AI_Guardrails_blogimage_11.3d359cef-2000.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/092_Guardrails-AI_Guardrails_blogimage_11-1.3d359cef-2000.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/093_Guardrails-AI_Guardrails_blogimage_12.0ab4fe51-2000.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/094_Guardrails-AI_Guardrails_blogimage_14.0e9598be-2000.jpg', colSpan: 6, colStart: 1 }
                ]
              }
            },
            {
              id: 'lattafa',
              title: 'Lattafa',
              type: 'page',
              content: {
                title: 'Lattafa',
                year: '2025',
                tags: '3D, Motion',
                description: '3D animation for Lattafa fragrance launch campaign.',
                thumbnail: 'https://cdn.isthishenry.com/img/095_Lattafa_Elixir_comboshot_v01_02.2918c5c9-1080.jpg',
                baseUrl: 'https://cdn.isthishenry.com/Lattafa/',
                blocks: [
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/096_Lattafa_Banoffi_Shot_05_05_sf_0003_01.f110f0fb-1800.jpg', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/095_Lattafa_Elixir_comboshot_v01_02.2918c5c9-1080.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/097_Lattafa_Elixir_comboshot_v01_06.72c16463-1080.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/098_Lattafa_Elixir_comboshot_v01_25.9f7415a3-2000.jpg', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/099_Lattafa_Elixir_comboshot_v01_33.587c9f3d-2000.jpg', colSpan: 12, colStart: 1 }
                ]
              }
            },
            {
              id: 'michael-m',
              title: 'Michael M',
              type: 'page',
              content: {
                title: 'Michael M',
                year: '2025',
                tags: '3D, Art Direction',
                description: '3D work for Michael M',
                thumbnail: 'https://cdn.isthishenry.com/img/100_Michael-M_050725_MM_hsa_Floating_Diamonds_V05.188e8694-2560.jpg',
                baseUrl: 'https://cdn.isthishenry.com/Michael%20M/',
                blocks: [
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/101_Michael-M_050725_MM_hsa_white_shelf_v06-1.77fdb134-2560.jpg', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/102_Michael-M_050725_MM_hsa_white_shelf_v08.224866e5-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'video', src: 'https://stream.mux.com/HysIY6C8p01ePAoeOKrN1FZhibWw2LblAg4UDGstJGqQ.m3u8', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/100_Michael-M_050725_MM_hsa_Floating_Diamonds_V05.188e8694-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/104_Michael-M_050725_MM_hsa_Floating_Diamonds_V06.cf6bca74-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/105_Michael-M_IMG_6142.29794086-2400.jpg', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/106_Michael-M_050725_MM_hsa_wood_v03.07eea906-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/107_Michael-M_050725_MM_hsa_wood_v04.89aa37aa-2560.jpg', colSpan: 6, colStart: 7 }
                ]
              }
            },
            {
              id: 'on-slide',
              title: 'ON Slide',
              type: 'page',
              content: {
                title: 'ON Slide',
                year: '2024',
                tags: '3D, Brand',
                description: 'Presentation design and motion graphics',
                thumbnail: 'https://cdn.isthishenry.com/img/108_ON-Slide_0605_RiddleOn_ORANGE_0004.38d38631-2560.jpg',
                baseUrl: 'https://cdn.isthishenry.com/RiddleON/',
                blocks: [
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/109_ON-Slide_0601_RiddleShoe_01.b8ac0365-1080.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/110_ON-Slide_0601_RiddleShoe_02.8371ebbb-1080.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/111_ON-Slide_0601_RiddleShoe_03.9ec22b89-1080.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/112_ON-Slide_0601_RiddleShoe_04.2491c377-1080.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/113_ON-Slide_0601_RiddleShoe_05.217dbfdb-1080.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/114_ON-Slide_0601_RiddleShoe_06.c331b6eb-1080.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/115_ON-Slide_0601_RiddleShoe_07.8bc28cea-2160.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/116_ON-Slide_0601_RiddleShoe_08.cfa18cd5-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/117_ON-Slide_0605_RiddleOn_0001.9f4bd329-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/118_ON-Slide_0605_RiddleOn_0002.ab35eeb8-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/119_ON-Slide_0605_RiddleOn_0003.45aff0dc-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/120_ON-Slide_0605_RiddleOn_0004.76afa4be-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/121_ON-Slide_0605_RiddleOn_0005.f6791b60-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/122_ON-Slide_0605_RiddleOn_ORANGE_0001.7ce0d522-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/123_ON-Slide_0605_RiddleOn_ORANGE_0002.3c7f6bc0-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/124_ON-Slide_0605_RiddleOn_ORANGE_0003.5bef3f35-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/108_ON-Slide_0605_RiddleOn_ORANGE_0004.38d38631-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/125_ON-Slide_0605_RiddleOn_ORANGE_0005.e2d0b3b1-2560.jpg', colSpan: 6, colStart: 7 }
                ]
              }
            },
            {
              id: 'modl',
              title: 'Modl',
              type: 'page',
              content: {
                title: 'Modl',
                year: '2025',
                tags: '3D, Digital',
                description: 'Furniture visualization demo',
                thumbnail: 'https://stream.mux.com/67YcBjFB9mcKItd8dnJtV6U0202zPP7fuN2VZzSvFEWU00.m3u8',
                blocks: [
                  { type: 'video', src: 'https://stream.mux.com/67YcBjFB9mcKItd8dnJtV6U0202zPP7fuN2VZzSvFEWU00.m3u8', colSpan: 8, colStart: 1 }
                ]
              }
            },
            {
              id: 'fact-machine',
              title: 'Fact Machine',
              type: 'page',
              content: {
                title: 'Fact Machine',
                year: '2024',
                tags: 'Motion, VFX',
                description: 'Interactive fact-checking platform',
                thumbnail: 'https://cdn.isthishenry.com/img/127_Fact-Machine_FactMachine_v07_directorscut_1x1_3_thumb.ad66d165-1900.jpg',
                blocks: [
                  { type: 'video', src: 'https://stream.mux.com/onZH4vMqfqsl003iHvjxqiPxrhyz00GNBIVxOyz66FrPQ.m3u8', colSpan: 8, colStart: 1 }
                ]
              }
            },
            {
              id: 'psyche-organic',
              title: 'Psyche Organic',
              type: 'page',
              content: {
                title: 'Psyche Organic',
                year: '2025',
                tags: '3D',
                description: 'Packaging renders and modeling for olive oil brand Psyche Organic.',
                thumbnail: 'https://cdn.isthishenry.com/img/129_Psyche-Organic_Psyche_organic_front_v3.7277eb02-2560.jpg',
                clickToExpand: true,
                blocks: [
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/129_Psyche-Organic_Psyche_organic_front_v3.7277eb02-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/130_Psyche-Organic_Psyche_organic_3qrtr_v02.2807899d-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/131_Psyche-Organic_Psyche_organic_side_v03.abe551fa-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/132_Psyche-Organic_Psyche_organic_back_v03.0c8e373b-2560.jpg', colSpan: 6, colStart: 7 }
                ]
              }
            },
            {
              id: 'sketches',
              title: 'Sketches',
              type: 'page',
              content: {
                title: 'Sketches',
                year: '2024–2026',
                tags: 'Sketches, Experiments',
                description: 'A collection of sketches, experiments, and visual studies.',
                thumbnail: 'https://cdn.isthishenry.com/sketches/Sketches1.GIF',
                clickToExpand: true,
                baseUrl: 'https://cdn.isthishenry.com/sketches/',
                blocks: [
                  { type: 'image', src: 'Sketches1.GIF', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/134_Sketches_Sketches2.6029def3-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches3.gif', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches4.gif', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches5.gif', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches6.gif', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/139_Sketches_Sketches7.67b2c559-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/140_Sketches_Sketches8.3006c389-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/141_Sketches_Sketches9.d8b3b4ae-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'video', src: 'https://stream.mux.com/ZBg68M3px1rZu8upcest3hCPub8irbSa65jIw5vAc4s.m3u8', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/143_Sketches_Sketches11.6907f189-2560.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/144_Sketches_Sketches12.abfdd17a-2560.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/145_Sketches_Sketches13.497d301f-1080.jpg', colSpan: 6, colStart: 1 },
                  { type: 'video', src: 'https://stream.mux.com/NI02PZIgJfJj00oRnf4WJZEwMcWky00fR00FuTyw6TcoD200.m3u8', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/147_Sketches_Sketches15.30db3368-1085.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/148_Sketches_Sketches17.d7749ddd-1075.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/149_Sketches_Sketches18.57c04d77-750.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/150_Sketches_Sketches19.cf69117b-1440.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/151_Sketches_Sketches20.4a0c50aa-1440.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/img/152_Sketches_Sketches21.053f3c85-750.jpg', colSpan: 6, colStart: 7 }
                ]
              }
            }
          ]
        },
        /* {
          id: '2025-reel',
          title: '2025 Reel',
          type: 'page',
          hideFromGrid: true,
          content: {
            title: 'Reel, 2025',
            year: '2025',
            tags: '3D, Motion, Generative',
            description: 'collection of work, 2024 - 2025. Blender, C4D, Octane, Houdini, Cavalry, Claude',
            thumbnail: 'https://stream.mux.com/9iCvQyU2AW3HaJprVMaLiGdUdyTnVEa400q74fDZIcjM.m3u8',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/9iCvQyU2AW3HaJprVMaLiGdUdyTnVEa400q74fDZIcjM.m3u8', colSpan: 8, colStart: 1 }
            ]
          }
        } */
      ]
    },
    {
      id: 'about',
      title: 'About',
      type: 'page',
      content: {
        isAboutPage: true,
        title: 'About',
        aboutText: `My name is Henry. I am a designer working with brands in tech and art. These days my work comes in three buckets:

1. 2D/3D Motion design in Blender, After Effects, Houdini, and Cavalry

2. Designing assets and style frames in Figma

3. Vibe-coding micro apps, interactive code snippets, and design tools.

My knowledge of 3D is extensive. My strongest skills are lighting, texturing, and modelling, though I have experience with all steps of the 3D pipeline. I spend a lot of time in Blender's Geometry nodes, a visual coding system for building procedural systems and I have experience building simulations in Houdini. I have extensive experience with product rendering.

When I am not in 3D I am often working in After Effects, and increasingly leaning on Cavalry to build complex animations with chains of dependencies.

Although I am not an engineer and have very limited experience writing code, I have been vibecoding for nearly 2 years. I have decent grasp on all elements of front end development and many areas of backend dev for small scale projects. I have built a few full projects for myself some of which can be found in my Projects section. In my current role I am regularly handling the full development cycle, starting in Figma and then moving to code using Claude. I have built and deployed interactive visual tools for clients and this year was contracted to build Welcome Jpeg's agency website.`,
        headline: 'Isthishenry? Yes.',
        statements: [
          {
            prefix: 'When I design, I am ',
            suffixes: [
              'thinking about participating in a conversation',
              'free',
              'learning from my heroes',
              'being in the world',
              'trusting my process',
              'confident'
            ]
          },
          {
            prefix: 'Great design means ',
            suffixes: [
              'to listen and speak with care',
              'to clarify',
              'to beckon',
              'to attend to',
              'to discover',
              'to push the edge',
              'to rediscover',
              'to celebrate',
              'to find again',
              'to have a vision',
              'to learn the world'
            ]
          }
        ],
        skills: ['3D', 'Motion', 'Brand', 'Vibecoding', 'Digital', 'VFX'],
        links: [
          { label: 'Email', href: 'mailto:isthishenry@gmail.com', underline: true },
          { label: 'Linkedin', href: 'https://linkedin.com/in/henryallan', underline: true }
        ],
        location: 'Based in NYC'
      }
    },
    {
      id: 'contact',
      title: 'Contact',
      type: 'page',
      hidden: true,
      content: {
        title: 'Contact',
        contactLinks: [
          { label: 'Email', value: 'isthishenry@gmail.com', href: 'mailto:isthishenry@gmail.com' },
          { label: 'Instagram', value: '@isthishenry', href: 'https://instagram.com/isthishenry' },
          { label: 'LinkedIn', value: 'henryallan', href: 'https://linkedin.com/in/henryallan' }
        ]
      }
    },
    {
      id: 'projects',
      title: 'Projects',
      type: 'submenu',
      content: {
        title: 'Projects',
        isGrid: true
      },
      submenu: [
        {
          id: 'poetry-map',
          title: 'Poetry Map',
          type: 'page',
          content: {
            title: 'Poetry Map',
            link: 'https://poetrymap.app',
            description: 'This is a poem visualizer using Open AI\'s embedding model and Threejs. A dataset of 1000+ poems are chunked and passed to Open AI embedding API. The resulting vector is reduced to 3 dimensions and mapped in space with a dot. The blue line connects them in order.',
            thumbnail: 'https://stream.mux.com/s11J3wAHUMyeC25fXvfK4rEcFNgru7LgRZNSKcwuzBI.m3u8',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/s11J3wAHUMyeC25fXvfK4rEcFNgru7LgRZNSKcwuzBI.m3u8', colSpan: 12, colStart: 1 }
            ]
          }
        },
        {
          id: 'codex-image',
          title: 'Codex-Image',
          type: 'page',
          content: {
            title: 'Codex-Image',
            description: 'A dynamic AI driven image vault.',
            thumbnail: 'https://cdn.isthishenry.com/img/154_Projects_Codex-image.270e2595-2560.jpg',
            blocks: [
              { type: 'image', src: 'https://cdn.isthishenry.com/img/154_Projects_Codex-image.270e2595-2560.jpg', colSpan: 12, colStart: 1 }
            ]
          }
        },
        {
          id: 'codex-book',
          title: 'Codex-Book',
          type: 'page',
          content: {
            title: 'Codex-Book',
            description: 'External brain productivity app with advanced RAG and custom tool integration.',
            thumbnail: 'https://cdn.isthishenry.com/img/155_Projects_Codex-book.157e39c1-2560.jpg',
            blocks: [
              { type: 'image', src: 'https://cdn.isthishenry.com/img/155_Projects_Codex-book.157e39c1-2560.jpg', colSpan: 12, colStart: 1 }
            ]
          }
        },
        {
          id: 'playspace',
          title: 'Playspace.life',
          type: 'page',
          content: {
            title: 'Playspace.life',
            description: 'Freeform social moodboard platform.',
            thumbnail: 'https://cdn.isthishenry.com/img/156_Projects_Playspace.d5008010-2560.jpg',
            blocks: [
              { type: 'image', src: 'https://cdn.isthishenry.com/img/156_Projects_Playspace.d5008010-2560.jpg', colSpan: 12, colStart: 1 }
            ]
          }
        },
        {
          id: 'catland',
          title: 'CatLand',
          type: 'page',
          content: {
            title: 'CatLand',
            description: 'A threejs videogame built with Blender and vibecoded with Claude',
            thumbnail: 'https://stream.mux.com/It01dpo1HFuVinRvuzMuf8FTehiSCCEJOLYib9jhOygU.m3u8',
            blocks: [
              { type: 'video', src: 'https://stream.mux.com/It01dpo1HFuVinRvuzMuf8FTehiSCCEJOLYib9jhOygU.m3u8', colSpan: 12, colStart: 1 }
            ]
          }
        }
      ]
    }
  ]
};
