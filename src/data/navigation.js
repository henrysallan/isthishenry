// Navigation structure for the portfolio site
export const navigationData = {
  home: {
    id: 'home',
    type: 'page',
    title: 'Home',
    content: {
      name: 'Henry Allan',
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
            thumbnail: 'https://cdn.isthishenry.com/exfy_helmet_rotation_v040001-0360.mp4',
            blocks: [
              { type: 'image', src: 'https://cdn.isthishenry.com/exfy/Barclays%20-%201.png', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/exfy/Exfy_Nets_Proof_v05.mp4', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/exfy/Barclays%20-%205.png', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/exfy_helmet_rotation_v040001-0360.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/f1_v02_1_4x5.mp4', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'https://cdn.isthishenry.com/exfy/Exfy_buisnesscard.png', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'https://cdn.isthishenry.com/exfy/exfy_helmet_v01_01png.png', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/exfy/barclays_3drotate_010001-0120.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/exfy/barclays_3drotate_020001-0120.mp4', colSpan: 6, colStart: 7 }
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
            thumbnail: 'https://cdn.isthishenry.com/smokeye/BuisnessCardMock_v03.png',
            blocks: [
              { type: 'video', src: 'https://player.vimeo.com/external/1172671748.m3u8?s=b130afd807d0ea4e5e114ede169cfe3780b875df&logging=false', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://player.vimeo.com/external/1172672258.m3u8?s=57711c63e8a2eb83e66c078dafa4230995c3b504&logging=false', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://player.vimeo.com/external/1172672186.m3u8?s=64c4c1621491b59e7f0beadf15c4cdb50df1947f&logging=false', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://player.vimeo.com/external/1172687093.m3u8?s=f2b5d82eebbc5b34f8259570340f99d15d774552&logging=false', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://player.vimeo.com/external/1172672280.m3u8?s=58a946e3dfc516c8f58b5c7bc85f03b45352127e&logging=false', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://player.vimeo.com/external/1172671940.m3u8?s=f6288715a5ce9abb03f3f13619d4bced72f191a3&logging=false', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://player.vimeo.com/external/1172671586.m3u8?s=b0cc22714cebe3bfef41226ff4ed133970954cf9&logging=false', colSpan: 12, colStart: 1 }
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
            thumbnail: 'https://cdn.isthishenry.com/WelcomeJpeg/WelcomelabsDemo_01_compressed.mp4',
            blocks: [
              { type: 'video', src: 'https://cdn.isthishenry.com/WelcomeJpeg/WelcomelabsDemo_01_compressed.mp4', colSpan: 12, colStart: 1 },
              { type: 'text', content: 'The site features a custom hero image system built with javascript. We scraped hundreds of images from the Welcome instagram feed and built a tool that can be dynamically updated and refined via control panel, bridging the gap between dev, design, and the client.', colSpan: 12, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/WelcomeJpeg/WelcomelabsDemo_02_compressed.mp4', colSpan: 12, colStart: 1 }
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
            thumbnail: 'https://cdn.isthishenry.com/worksuite/Worksuite_Stacks_v06_01.png',
            baseUrl: 'https://cdn.isthishenry.com/worksuite/',
            blocks: [
              { type: 'image', src: 'Worksuite_Stacks_v06_01.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_01.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_02.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_02.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_03.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_03.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_04.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_04.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_05.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_05.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_06.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_06.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_07.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_07.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_08.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_08.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_09.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_09.1.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'Worksuite_Stacks_v06_10.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'Worksuite_Stacks_v06_10.1.png', colSpan: 6, colStart: 7 }
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
              { type: 'image', src: '022025_ithol_blackfriday_sideangle_v01.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: '022125_ithol_blackfriday_KV9_v06.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: '022125_ithol_blackfriday_08_v09.png', colSpan: 12, colStart: 1 },
              
              { type: 'image', src: '022125_ithol_blackfriday_v04.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: '071624_It_Helix_BoxArt_2025_lightpink_DayTonight_v04.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: '0718_itD11_helix_glasspedastal_v01.png', colSpan: 12, colStart: 1 },
              { type: 'image', src: '0720_ITD11_sssRibbons_pedastal_v10.png', colSpan: 12, colStart: 1 },
              { type: 'image', src: 'itcos_testing.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: '120524_ITC_KV2_Henry_v3_02.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'ITC_D11_tech_image_v010_anim2.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'ITC_editorial_25_KV_01_Charm-Transform-023.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'IT_D11_Shot4_drips_v10_nobigdrip.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'IT_D11_Shot8_24hr_BBUE_v014.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'IT_d11_PH1_KV1_v001_set_001_HP_0005.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: 'IT_d11_PH1_KV1_v001_set_001_HP_0007.png', colSpan: 6, colStart: 7 },
              { type: 'image', src: 'ithol25_Boxes_Shelves_v01.png', colSpan: 6, colStart: 1 }
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
            thumbnail: 'https://cdn.isthishenry.com/Kalshi/KALSHI_MSG_HSA_V05_1570.mp4',
            blocks: [
              { type: 'video', src: 'https://cdn.isthishenry.com/Kalshi/FINAL_kalshinba_v06_withwalk.mov', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/Kalshi/KALSHI_MSG_HSA_V05_1570.mp4', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://cdn.isthishenry.com/Kalshi/Klashi_desert_comp_v11_SFX_v07_compr_40mb.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/Kalshi/MSG2_KALSHI_v06_nozoom.mp4', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://cdn.isthishenry.com/KalshiStates_Arizona.mov', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/KalshiStates_Nevada_Harris.mov', colSpan: 6, colStart: 7 },
              { type: 'video', src: 'https://cdn.isthishenry.com/Kalshi_sportshere_Dark_v07_1_vertical.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: 'https://cdn.isthishenry.com/KlashiMapasset2_rendertest_v10_1x1.mov', colSpan: 6, colStart: 7 }
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
            thumbnail: 'https://cdn.isthishenry.com/MSCHF/03_16x9_outdoor_boxshot.mp4',
            baseUrl: 'https://cdn.isthishenry.com/MSCHF/',
            blocks: [
              { type: 'video', src: '072DstyleIdea_1x1.mp4', colSpan: 12, colStart: 1 },
              { type: 'video', src: '03_16x9_outdoor_boxshot.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: '04_Bball_pass1.mp4', colSpan: 6, colStart: 7 },
              //{ type: 'video', src: '02_4x5_lifestyle.mp4', colSpan: 6, colStart: 1 },
              //{ type: 'video', src: '02_float_pieces0000-0061.mp4', colSpan: 6, colStart: 7 },
              //{ type: 'video', src: '02_puzren10001-0250.mp4', colSpan: 6, colStart: 1 },
              //{ type: 'video', src: '02_scanrender0001-0062.mp4', colSpan: 6, colStart: 7 },
              
              { type: 'video', src: '04_Bookshelf_16x9.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: '04_CoffeeTable_pass1_16x9.mp4', colSpan: 6, colStart: 7 },
              { type: 'video', src: '04_desk_16x9Render.mov', colSpan: 6, colStart: 1 },
              { type: 'video', src: '04_gameshow_BF_16x9.mp4', colSpan: 6, colStart: 7 },
              { type: 'video', src: '04_nightstand_pass10001-0112.mp4', colSpan: 12, colStart: 1 },
              //{ type: 'video', src: '05_bundledrop0001-0061.mp4', colSpan: 6, colStart: 7 },
              //{ type: 'image', src: '05_darkpileofpuzzle.png', colSpan: 6, colStart: 1 },
              //{ type: 'video', src: '05_ed2seq.mp4', colSpan: 6, colStart: 7 },
              { type: 'image', src: '06_STILL3_4x5.png', colSpan: 6, colStart: 1 },
              { type: 'image', src: '06_STILL5_glow_4x5.png', colSpan: 6, colStart: 7 },
              { type: 'video', src: '06_halloween_2_16x9.mp4', colSpan: 12, colStart: 1 },
              //{ type: 'image', src: '06_halloween_still1_4x5.png', colSpan: 6, colStart: 1 },
              { type: 'video', src: '06_haloweekrender10001-0250.mp4', colSpan: 12, colStart: 1 },
              { type: 'video', src: '06columbusday_unbox_16x9.mp4', colSpan: 6, colStart: 1 },
              { type: 'video', src: '06labor20001-0143.mp4', colSpan: 6, colStart: 7 },
              
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
              id: 'guardrails-ai',
              title: 'Guardrails AI',
              type: 'page',
              content: {
                title: 'Guardrails AI',
                year: '2026',
                tags: '3D',
                description: '3D illustration for Guardrails AI',
                thumbnail: 'https://cdn.isthishenry.com/guardrails/Guardrails_blogimage_01.png',
                baseUrl: 'https://cdn.isthishenry.com/guardrails/',
                blocks: [
                  { type: 'image', src: 'Guardrails_blogimage_01.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Guardrails_blogimage_03.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Guardrails_blogimage_04.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Guardrails_blogimage_05.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Guardrails_blogimage_06.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Guardrails_blogimage_07.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Guardrails_blogimage_08.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Guardrails_blogimage_09.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Guardrails_blogimage_10.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Guardrails_blogimage_11.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Guardrails_blogimage_11%20(1).png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Guardrails_blogimage_12.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Guardrails_blogimage_14.png', colSpan: 6, colStart: 1 }
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
                thumbnail: 'https://cdn.isthishenry.com/Lattafa/Elixir_comboshot_v01_02.png',
                baseUrl: 'https://cdn.isthishenry.com/Lattafa/',
                blocks: [
                  { type: 'image', src: 'Banoffi_Shot_05_05_sf_0003_01.png', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'Elixir_comboshot_v01_02.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Elixir_comboshot_v01_06.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Elixir_comboshot_v01_25.png', colSpan: 12, colStart: 1 },
                  { type: 'image', src: 'Elixir_comboshot_v01_33.png', colSpan: 12, colStart: 1 }
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
                thumbnail: 'https://cdn.isthishenry.com/Michael%20M/050725_MM_hsa_Floating_Diamonds_V05.png',
                baseUrl: 'https://cdn.isthishenry.com/Michael%20M/',
                blocks: [
                  { type: 'image', src: '050725_MM_hsa_white_shelf_v06%20(1).png', colSpan: 12, colStart: 1 },
                  { type: 'image', src: '050725_MM_hsa_white_shelf_v08.png', colSpan: 6, colStart: 1 },
                  { type: 'video', src: '050725_MM_hsa_Earing_smoke_V06%20(1).mp4', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '050725_MM_hsa_Floating_Diamonds_V05.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '050725_MM_hsa_Floating_Diamonds_V06.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'IMG_6142.png', colSpan: 12, colStart: 1 },
                  { type: 'image', src: '050725_MM_hsa_wood_v03.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '050725_MM_hsa_wood_v04.png', colSpan: 6, colStart: 7 }
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
                thumbnail: 'https://cdn.isthishenry.com/RiddleON/0605_RiddleOn_ORANGE_0004.png',
                baseUrl: 'https://cdn.isthishenry.com/RiddleON/',
                blocks: [
                  { type: 'image', src: '0601_RiddleShoe_01.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0601_RiddleShoe_02.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0601_RiddleShoe_03.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0601_RiddleShoe_04.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0601_RiddleShoe_05.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0601_RiddleShoe_06.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0601_RiddleShoe_07.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0601_RiddleShoe_08.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0605_RiddleOn_0001.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0605_RiddleOn_0002.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0605_RiddleOn_0003.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0605_RiddleOn_0004.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0605_RiddleOn_0005.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0605_RiddleOn_ORANGE_0001.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0605_RiddleOn_ORANGE_0002.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0605_RiddleOn_ORANGE_0003.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: '0605_RiddleOn_ORANGE_0004.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: '0605_RiddleOn_ORANGE_0005.png', colSpan: 6, colStart: 7 }
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
                thumbnail: 'https://cdn.isthishenry.com/FurnitureDemo_jake_v01.mov',
                blocks: [
                  { type: 'video', src: 'https://cdn.isthishenry.com/FurnitureDemo_jake_v01.mov', colSpan: 8, colStart: 1 }
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
                thumbnail: 'https://cdn.isthishenry.com/factmachine/FactMachine_v07_directorscut_1x1_3_thumb.jpg',
                blocks: [
                  { type: 'video', src: 'https://cdn.isthishenry.com/factmachine/FactMachine_v07_directorscut_1x1_3_compressed.mp4', colSpan: 8, colStart: 1 }
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
                thumbnail: 'https://cdn.isthishenry.com/Psyche_organic_front_v3.png',
                clickToExpand: true,
                blocks: [
                  { type: 'image', src: 'https://cdn.isthishenry.com/Psyche_organic_front_v3.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/Psyche_organic_3qrtr_v02.png', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/Psyche_organic_side_v03.png', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'https://cdn.isthishenry.com/Psyche_organic_back_v03.png', colSpan: 6, colStart: 7 }
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
                  { type: 'image', src: 'Sketches2.PNG', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches3.gif', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches4.gif', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches5.gif', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches6.gif', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches7.PNG', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches8.PNG', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches9.PNG', colSpan: 6, colStart: 1 },
                  { type: 'video', src: 'Sketches10.mp4', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches11.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches12.PNG', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches13.png', colSpan: 6, colStart: 1 },
                  { type: 'video', src: 'Sketches14.mp4', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches15.PNG', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches17.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches18.PNG', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches19.jpg', colSpan: 6, colStart: 7 },
                  { type: 'image', src: 'Sketches20.jpg', colSpan: 6, colStart: 1 },
                  { type: 'image', src: 'Sketches21.PNG', colSpan: 6, colStart: 7 }
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
            thumbnail: 'https://cdn.isthishenry.com/REEL_2025_07_A_HENRYALLAN_mp42k2.mp4',
            blocks: [
              { type: 'video', src: 'https://cdn.isthishenry.com/REEL_2025_07_A_HENRYALLAN_mp42k2.mp4', colSpan: 8, colStart: 1 }
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
      type: 'page',
      content: {
        title: 'Projects',
        isProjectsPage: true,
        projects: [
          {
            title: 'Poetry Map',
            link: 'https://poetrymap.app',
            description: 'This is a poem visualizer using Open AI\'s embedding model and Threejs. A dataset of 1000+ poems are chunked and passed to Open AI embedding API. The resulting vector is reduced to 3 dimensions and mapped in space with a dot. The blue line connects them in order.',
            video: 'https://cdn.isthishenry.com/projects/poetrymapvideo2.mov'
          },
          {
            title: 'Codex-Image',
            description: 'A dynamic AI driven image vault.',
            image: 'https://cdn.isthishenry.com/projects/Codex-image.png'
          },
          {
            title: 'Codex-Book',
            description: 'External brain productivity app with advanced RAG and custom tool integration.',
            image: 'https://cdn.isthishenry.com/projects/Codex-book.png'
          },
          {
            title: 'Playspace.life',
            description: 'Freeform social moodboard platform.',
            image: 'https://cdn.isthishenry.com/projects/Playspace.png'
          },
          {
            title: 'CatLand',
            description: 'A threejs videogame built with Blender and vibecoded with Claude',
            video: 'https://cdn.isthishenry.com/projects/catlandcomp.mov'
          }
        ]
      }
    }
  ]
};
