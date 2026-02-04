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
          id: '2025-reel',
          title: '2025 Reel',
          type: 'page',
          content: {
            title: 'Reel, 2025',
            description: 'collection of work, 2024 - 2025. Blender, C4D, Octane, Houdini, Cavalry, Claude',
            videoUrl: 'https://cdn.isthishenry.com/REEL_2025_07_A_HENRYALLAN_mp42k2.mp4'
          }
        },
        {
          id: 'it-cosmetics',
          title: 'IT Cosmetics',
          type: 'page',
          content: {
            title: 'IT Cosmetics',
            description: 'Worked year round on 3D assets for IT Cosmetics. Responsible for environment design, lighting, lookdev, and rendering. Also was lead editor for IT Cosmetics holiday 2024 campaign',
            thumbnail: 'https://cdn.isthishenry.com/itcosmetics/capaing24gif.gif',
            imageGallery: {
              baseUrl: 'https://cdn.isthishenry.com/itcosmetics/',
              columns: 3,
              clickToExpand: true,
              images: [
                'capaing24gif.gif',
                '022025_ithol_blackfriday_sideangle_v01.png',
                '022125_ithol_blackfriday_08_v09.png',
                '022125_ithol_blackfriday_KV9_v06.png',
                '022125_ithol_blackfriday_v04.png',
                '071624_It_Helix_BoxArt_2025_lightpink_DayTonight_v04.png',
                '0718_itD11_helix_glasspedastal_v01.png',
                '0720_ITD11_sssRibbons_pedastal_v10.png',
                '1121_ITHOI25_testingstation_v05.png',
                '120524_ITC_KV2_Henry_v3_02.png',
                'ITC_D11_tech_image_v010_anim2.png',
                'ITC_editorial_25_KV_01_Charm-Transform-023.png',
                'IT_D11_Shot4_drips_v10_nobigdrip.png',
                'IT_D11_Shot8_24hr_BBUE_v014.png',
                'IT_d11_PH1_KV1_v001_set_001_HP_0005.png',
                'IT_d11_PH1_KV1_v001_set_001_HP_0007.png',
                'ithol25_Boxes_Shelves_v01.png'
              ]
            }
          }
        },
        {
          id: 'expensify-f1',
          title: 'Expensify F1',
          type: 'page',
          content: {
            title: 'Expensify F1',
            description: 'F1 sponsorship campaign visuals',
            thumbnail: 'https://cdn.isthishenry.com/exfy_helmet_rotation_v040001-0360.mp4',
            videoGallery: {
              columns: 2,
              videos: [
                'https://cdn.isthishenry.com/exfy_helmet_rotation_v040001-0360.mp4',
                'https://cdn.isthishenry.com/f1_v02_1_4x5.mp4'
              ]
            }
          }
        },
        {
          id: 'fact-machine',
          title: 'Fact Machine',
          type: 'page',
          content: {
            title: 'Fact Machine',
            description: 'Interactive fact-checking platform',
            thumbnail: 'https://cdn.isthishenry.com/factmachine/FactMachine_v07_directorscut_1x1_3_thumb.jpg',
            videoUrl: 'https://cdn.isthishenry.com/factmachine/FactMachine_v07_directorscut_1x1_3_compressed.mp4'
          }
        },
        {
          id: 'on-slide',
          title: 'ON Slide',
          type: 'page',
          content: {
            title: 'ON Slide',
            description: 'Presentation design and motion graphics',
            thumbnail: 'https://cdn.isthishenry.com/RiddleON/0605_RiddleOn_ORANGE_0004.png',
            imageGallery: {
              baseUrl: 'https://cdn.isthishenry.com/RiddleON/',
              columns: 2,
              images: [
                '0601_RiddleShoe_01.png',
                '0601_RiddleShoe_02.png',
                '0601_RiddleShoe_03.png',
                '0601_RiddleShoe_04.png',
                '0601_RiddleShoe_05.png',
                '0601_RiddleShoe_06.png',
                '0601_RiddleShoe_07.png',
                '0601_RiddleShoe_08.png',
                '0605_RiddleOn_0001.png',
                '0605_RiddleOn_0002.png',
                '0605_RiddleOn_0003.png',
                '0605_RiddleOn_0004.png',
                '0605_RiddleOn_0005.png',
                '0605_RiddleOn_ORANGE_0001.png',
                '0605_RiddleOn_ORANGE_0002.png',
                '0605_RiddleOn_ORANGE_0003.png',
                '0605_RiddleOn_ORANGE_0004.png',
                '0605_RiddleOn_ORANGE_0005.png'
              ]
            }
          }
        },
        {
          id: 'kalshi',
          title: 'Kalshi',
          type: 'page',
          content: {
            title: 'Kalshi',
            description: 'From their initial launch during the election, through some of their largest initial markets, I was brought on to conceptualize and produce VFX assets to promote Kalshis top markets. From initial strategy - pitching 5-10 concepts per market - through execution in 3D and 2D comp, I created eye catching videos that recieved millions of impressions. ',
            thumbnail: 'https://cdn.isthishenry.com/Kalshi/KALSHI_MSG_HSA_V05_1570.mp4',
            videoGallery: {
              columns: 2,
              videos: [
                'https://cdn.isthishenry.com/Kalshi/FINAL_kalshinba_v06_withwalk.mov',
                'https://cdn.isthishenry.com/Kalshi/KALSHI_MSG_HSA_V05_1570.mp4',
                'https://cdn.isthishenry.com/Kalshi/Klashi_desert_comp_v11_SFX_v07_compr_40mb.mp4',
                'https://cdn.isthishenry.com/Kalshi/MSG2_KALSHI_v06_nozoom.mp4',
                'https://cdn.isthishenry.com/KalshiStates_Arizona.mov',
                'https://cdn.isthishenry.com/KalshiStates_Nevada_Harris.mov',
                'https://cdn.isthishenry.com/Kalshi_sportshere_Dark_v07_1_vertical.mp4',
                'https://cdn.isthishenry.com/KlashiMapasset2_rendertest_v10_1x1.mov',
                
              ]
            }
          }
        },
        {
          id: 'mschf',
          title: 'MSCHF',
          type: 'page',
          content: {
            title: 'MSCHF',
            description: 'MSCHF is an art collective known for their viral and provocative projects. I worked on a variety of motion and 3D assets for their 2 Million Dollar Puzzle. My work included 3D modeling, texturing, lighting, and animation to create engaging visuals that aligned with MSCHFs unique brand identity. I led the strategy and production of 30 animations over 8 months.',
            thumbnail: 'https://cdn.isthishenry.com/MSCHF/03_16x9_outdoor_boxshot.mp4',
            mediaGallery: {
              baseUrl: 'https://cdn.isthishenry.com/MSCHF/',
              columns: 3,
              items: [
                '02_4x5_lifestyle.mp4',
                '02_float_pieces0000-0061.mp4',
                '02_puzren10001-0250.mp4',
                '02_scanrender0001-0062.mp4',
                '03_16x9_outdoor_boxshot.mp4',
                '04_Bball_pass1.mp4',
                '04_Bookshelf_16x9.mp4',
                '04_CoffeeTable_pass1_16x9.mp4',
                '04_desk_16x9Render.mov',
                '04_gameshow_BF_16x9.mp4',
                '04_nightstand_pass10001-0112.mp4',
                '05_bundledrop0001-0061.mp4',
                '05_darkpileofpuzzle.png',
                '05_ed2seq.mp4',
                '06_STILL3_4x5.png',
                '06_STILL5_glow_4x5.png',
                '06_halloween_2_16x9.mp4',
                '06_halloween_still1_4x5.png',
                '06_haloweekrender10001-0250.mp4',
                '06columbusday_unbox_16x9.mp4',
                '06labor20001-0143.mp4',
                '072DstyleIdea_1x1.mp4',
                '07_2Dadstyle_thispuzchangelife_blue.png'
              ]
            }
          }
        },
        {
          id: 'modl',
          title: 'Modl',
          type: 'page',
          content: {
            title: 'Modl',
            description: 'Furniture visualization demo',
            videoUrl: 'https://cdn.isthishenry.com/FurnitureDemo_jake_v01.mov'
          }
        },
        {
          id: 'lattafa',
          title: 'Lattafa',
          type: 'page',
          content: {
            title: 'Lattafa',
            description: 'Lattafa, a fragrence company, requested 3D animation to drive the launch of their new fragrances.',
            thumbnail: 'https://cdn.isthishenry.com/Lattafa/Elixir_comboshot_v01_02.png',
            mediaGallery: {
              baseUrl: 'https://cdn.isthishenry.com/Lattafa/',
              columns: 2,
              items: [
                'Banoffi_Shot_05_05_sf_0003_01.png',
                'Elixir_comboshot_v01_02.png',
                'Elixir_comboshot_v01_06.png',
                'Elixir_comboshot_v01_25.png',
                'Elixir_comboshot_v01_33.png'
                
              ]
            }
          }
        },
        {
          id: 'michael-m',
          title: 'Michael M',
          type: 'page',
          content: {
            title: 'Michael M',
            description: '3D work for Michael M',
            thumbnail: 'https://cdn.isthishenry.com/Michael%20M/050725_MM_hsa_Floating_Diamonds_V05.png',
            mediaGallery: {
              baseUrl: 'https://cdn.isthishenry.com/Michael%20M/',
              columns: 2,
              items: [
                '050725_MM_hsa_Earing_smoke_V06%20(1).mp4',
                '050725_MM_hsa_Floating_Diamonds_V05.png',
                '050725_MM_hsa_Floating_Diamonds_V06.png',
                '050725_MM_hsa_white_shelf_v06%20(1).png',
                '050725_MM_hsa_white_shelf_v08.png',
                '050725_MM_hsa_wood_v03.png',
                '050725_MM_hsa_wood_v04.png',
                'IMG_6142.png'
              ]
            }
          }
        }
      ]
    },
    {
      id: 'about',
      title: 'About',
      type: 'page',
      content: {
        title: 'About',
        description: 'I am a motion designer and 3D artist specializing in brand content, generative design, and creative coding. I have worked with a variety of clients ranging from startups to established brands, helping them bring their ideas to life through engaging visuals.\n \n I use Blender, Cinema 4D, and Houdini in my 3D workflows. I use After Effects, Cavalry, and Davinci Resolve for 2D and comp. I use Figma for design and layout. \n \n increasingly I have begun developing tools and apps using LLMs to write code. My background is not in software engineering, but through my work building web experiences I have gained substantial intuitions around development. This website is enitrely developed by me using LLMs. '
        
      }
    },
    {
      id: 'contact',
      title: 'Contact',
      type: 'page',
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
        description: 'Various projects and experiments',
        sections: [
          {
            title: 'CatLand',
            titleLink: 'https://catland-55120.web.app/',
            description: 'A threejs game.',
            imageGallery: {
              baseUrl: 'https://cdn.isthishenry.com/catland/',
              columns: 1,
              images: [
                'catland1.png',
                'catland2.png'
              ]
            }
          }
        ]
      }
    }
  ]
};
