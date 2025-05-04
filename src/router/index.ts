import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

// Eager load frequently used routes for faster loading
import BlogDashboard from '../views/BlogDashboard.vue'
import BlogDetail from '../views/BlogDetail.vue'
import SocialDashboard from '../views/SocialDashboard.vue'
import SocialDetail from '../views/SocialDetail.vue'

// These will be lazy loaded
// import BlogCalendarView from '../views/BlogCalendarView.vue'
// import KeywordsDashboard from '../views/KeywordsDashboard.vue'
// import AnalyticsDashboard from '../views/AnalyticsDashboard.vue'

const routes: Array<RouteRecordRaw> = [
  // Default route redirects to blog dashboard
  { 
    path: '/', 
    redirect: '/blog'
  },
  
  // Blog management routes
  { 
    path: '/blog', 
    name: 'blog-dashboard',
    component: BlogDashboard,
    meta: { title: 'Blog Dashboard' }
  },
  { 
    path: '/blog/calendar', 
    name: 'blog-calendar',
    component: () => import('../views/BlogCalendarView.vue'),
    meta: { title: 'Blog Calendar' }
  },
  { 
    path: '/blog/:id', 
    name: 'blog-detail',
    component: BlogDetail, 
    props: true,
    meta: { title: 'Blog Details' }
  },
  { 
    path: '/blog/:id/edit', 
    name: 'blog-edit',
    component: () => import('../views/BlogEdit.vue'),
    props: true,
    meta: { title: 'Edit Blog' }
  },
  { 
    path: '/blog/:id/preview', 
    name: 'blog-preview',
    component: () => import('../views/BlogPreview.vue'),
    props: true,
    meta: { title: 'Preview Blog' }
  },
  
  // Keywords management route
  {
    path: '/keywords',
    name: 'keywords-dashboard',
    component: () => import('../views/KeywordsDashboard.vue'),
    meta: { title: 'Keywords Management' }
  },
  
  // Analytics dashboard route
  {
    path: '/analytics',
    name: 'analytics-dashboard',
    component: () => import('../views/AnalyticsDashboard.vue'),
    meta: { title: 'Analytics Dashboard' }
  },
  
  // Social media routes
  { 
    path: '/social', 
    name: 'social-dashboard',
    component: SocialDashboard,
    meta: { title: 'Social Media Dashboard' }
  },
  { 
    path: '/social/:id', 
    name: 'social-detail',
    component: SocialDetail, 
    props: true,
    meta: { title: 'Social Media Post' }
  },
  
  // Settings route
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: 'Settings' }
  },
  
  // Create new blog route
  {
    path: '/blog/create',
    name: 'blog-create',
    component: () => import('../views/BlogEdit.vue'),
    meta: { title: 'Create New Blog Post' }
  },
  
  // Social media creation route
  {
    path: '/social/create',
    name: 'social-create',
    component: () => import('../views/SocialEdit.vue'),
    meta: { title: 'Create Social Media Post' }
  },
  
  // Catch-all route for 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/blog'
  }
]

// Create router instance
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards - update page title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title as string || 'LM Studio Agents'
  next()
})

export default router
