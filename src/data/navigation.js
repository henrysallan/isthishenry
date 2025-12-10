// Navigation structure for the portfolio site
export const navigationData = {
  home: {
    id: 'home',
    type: 'page',
    title: 'Home',
    content: {
      name: 'Henry Allan',
      subtitle: 'motion, brand, generative design',
      current: 'current:\nthe collected works',
      past: 'past:\n\nvmgroupe\nkalshi\nmschf'
    }
  },
  mainMenu: [
    {
      id: 'work',
      title: 'Work',
      type: 'submenu',
      submenu: [
        {
          id: '2025-reel',
          title: '2025 Reel',
          type: 'page',
          content: {
            title: 'Reel, 2025',
            description: 'collection of work, 2024 - 2025. Blender, C4D, Octane, Houdini, Cavalry, Claude',
            videoKey: '2025-reel.mp4'
          }
        },
        {
          id: 'fact-machine',
          title: 'Fact Machine',
          type: 'page',
          content: {
            title: 'Fact Machine',
            description: 'Interactive fact-checking platform',
            videoKey: 'fact-machine.mp4'
          }
        },
        {
          id: 'on-slide',
          title: 'ON Slide',
          type: 'page',
          content: {
            title: 'ON Slide',
            description: 'Presentation design and motion graphics',
            videoKey: 'on-slide.mp4'
          }
        },
        {
          id: 'kalshi',
          title: 'Kalshi',
          type: 'page',
          content: {
            title: 'Kalshi',
            description: 'Prediction market platform',
            videoKey: 'kalshi.mp4'
          }
        },
        {
          id: 'mschf',
          title: 'MSCHF',
          type: 'page',
          content: {
            title: 'MSCHF',
            description: 'Creative studio projects',
            videoKey: 'mschf.mp4'
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
        description: 'Learn more about my work and process'
      }
    },
    {
      id: 'contact',
      title: 'Contact',
      type: 'page',
      content: {
        title: 'Contact',
        description: 'Get in touch'
      }
    },
    {
      id: 'projects',
      title: 'Projects',
      type: 'page',
      content: {
        title: 'Projects',
        description: 'Various projects and experiments'
      }
    }
  ]
};
