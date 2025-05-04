import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/blog',
      name: 'Blog',
      component: () => import('../views/blog/BlogDashboard.vue')
    },
    {
      path: '/blog/:id',
      name: 'BlogDetail',
      component: () => import('../views/blog/BlogDetail.vue'),
      props: true
    },
    {
      path: '/blog/:id/edit',
      name: 'BlogEdit',
      component: () => import('../views/blog/BlogEdit.vue'),
      props: true
    },
    {
      path: '/keywords',
      name: 'Keywords',
      component: () => import('../views/keywords/KeywordsDashboard.vue')
    },
    {
      path: '/social',
      name: 'Social',
      component: () => import('../views/social/SocialDashboard.vue')
    },
    {
      path: '/social/:id',
      name: 'SocialDetail',
      component: () => import('../views/social/SocialDetail.vue'),
      props: true
    },
    {
      path: '/social/:id/edit',
      name: 'SocialEdit',
      component: () => import('../views/social/SocialEdit.vue'),
      props: true
    },
    {
      path: '/analytics',
      name: 'Analytics',
      component: () => import('../views/analytics/AnalyticsDashboard.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/settings/Settings.vue')
    }
  ]
})

export default router

