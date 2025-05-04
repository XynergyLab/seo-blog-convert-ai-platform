import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../store';
import { useAuth0 } from '../auth.plugin';

// Declare custom meta fields for TypeScript
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    title?: string;
    description?: string;
    devOnly?: boolean; // For development-only routes
  }
}

// Eager load frequently used routes
import BlogDashboard from '../views/BlogDashboard.vue';
import BlogDetail from '../views/BlogDetail.vue';
import SocialDashboard from '../views/SocialDashboard.vue';
import SocialDetail from '../views/SocialDetail.vue';
import BlogCreateForm from '../components/blog/BlogCreateForm.vue';

const routes: Array<RouteRecordRaw> = [
  // Public routes
  { 
    path: '/', 
    redirect: '/blog',
    meta: { 
      requiresAuth: false
    }
  },
  
  // Auth callback route - public
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('../views/AuthCallback.vue'),
    meta: { 
      requiresAuth: false,
      title: 'Authentication'
    }
  },
  
  // Protected routes - Blog Management
  { 
    path: '/blog', 
    name: 'blog-dashboard',
    component: BlogDashboard,
    meta: { 
      requiresAuth: true,
      title: 'Blog Dashboard',
      description: 'Manage your blog posts' 
    }
  },
  
  {
    path: '/blog/create',
    name: 'blog-create',
    component: BlogCreateForm,
    meta: { 
      requiresAuth: true,
      title: 'Create New Blog Post',
      description: 'Create a new AI-generated blog post'
    }
  },
  
  { 
    path: '/blog/calendar', 
    name: 'blog-calendar',
    component: () => import('../views/BlogCalendarView.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Blog Calendar',
      description: 'View your content calendar' 
    }
  },
  
  { 
    path: '/blog/:id', 
    name: 'blog-detail',
    component: BlogDetail, 
    props: true,
    meta: { 
      requiresAuth: true,
      title: 'Blog Details',
      description: 'View blog post details'
    }
  },
  
  { 
    path: '/blog/:id/edit', 
    name: 'blog-edit',
    component: () => import('../views/BlogEdit.vue'),
    props: true,
    meta: { 
      requiresAuth: true,
      title: 'Edit Blog',
      description: 'Edit your blog post'
    }
  },
  
  { 
    path: '/blog/:id/versions', 
    name: 'blog-versions',
    component: () => import('../components/blog/BlogPreview.vue'),
    props: route => ({ 
      id: route.params.id,
      showVersionHistory: true 
    }),
    meta: { 
      requiresAuth: true,
      title: 'Blog Version History',
      description: 'View and restore previous versions'
    }
  },
  
  { 
    path: '/blog/:id/versions/:versionId', 
    name: 'blog-version-preview',
    component: () => import('../components/blog/BlogPreview.vue'),
    props: route => ({ 
      id: route.params.id,
      versionId: route.params.versionId,
      showVersionHistory: true 
    }),
    meta: { 
      requiresAuth: true,
      title: 'Blog Version Preview',
      description: 'Preview a specific version of your blog post'
    }
  },
  
  { 
    path: '/blog/:id/preview', 
    name: 'blog-preview',
    component: () => import('../components/blog/BlogPreview.vue'),
    props: true,
    meta: { 
      requiresAuth: true,
      title: 'Preview Blog',
      description: 'Preview your blog post'
    }
  },
  
  // Protected routes - Keywords & Analytics
  {
    path: '/keywords',
    name: 'keywords-dashboard',
    component: () => import('../views/KeywordsDashboard.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Keywords Management',
      description: 'Manage SEO keywords for your content'
    }
  },
  
  {
    path: '/analytics',
    name: 'analytics-dashboard',
    component: () => import('../views/AnalyticsDashboard.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Analytics Dashboard',
      description: 'View content performance analytics'
    }
  },
  
  // Protected routes - Social Media
  { 
    path: '/social', 
    name: 'social-dashboard',
    component: SocialDashboard,
    meta: { 
      requiresAuth: true,
      title: 'Social Media Dashboard',
      description: 'Manage your social media posts'
    }
  },
  
  {
    path: '/social/create',
    name: 'social-create',
    component: () => import('../views/SocialEdit.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Create Social Media Post',
      description: 'Create a new social media post'
    }
  },
  
  { 
    path: '/social/:id', 
    name: 'social-detail',
    component: SocialDetail, 
    props: true,
    meta: { 
      requiresAuth: true,
      title: 'Social Media Post',
      description: 'View social media post details'
    }
  },
  
  // Protected routes - Settings
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Settings',
      description: 'Application settings and preferences'
    }
  },
  
  // Development only routes
  {
    path: '/dev/redis-test',
    name: 'redis-test',
    component: () => import('../views/RedisTestPage.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Redis Migration Tests',
      description: 'Test Redis-backed store implementation',
      devOnly: true
    }
  },
  
  // Catch-all route - public
  {
    path: '/:pathMatch(.*)*',
    redirect: '/blog',
    meta: {
      requiresAuth: false
    }
  }
];

// Create router instance
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// Navigation guard for authentication
router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const authStore = useAuthStore();
  const auth0 = useAuth0();

  // Update page title
  document.title = to.meta.title ? `${to.meta.title} - LM Studio Agents` : 'LM Studio Agents';
  
  // Check if route is dev-only in production mode
  if (to.meta.devOnly && process.env.NODE_ENV === 'production') {
    return next('/');
  }

  // Skip auth check for callback route
  if (to.name === 'auth-callback') {
    return next();
  }

  // Check if route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Check authentication status
    if (!authStore.authenticated) {
      try {
        // Try silent authentication first
        await auth0.getTokenSilently();
        const isAuthenticated = await auth0.checkAuth();
        
        if (!isAuthenticated) {
          // Store the intended route
          authStore.setRedirectPath(to.fullPath);
          // Redirect to login
          await auth0.loginWithRedirect({
            appState: { targetUrl: to.fullPath }
          });
          return;
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Store the intended route
        authStore.setRedirectPath(to.fullPath);
        // Redirect to login
        await auth0.loginWithRedirect({
          appState: { targetUrl: to.fullPath }
        });
        return;
      }
    }
  }

  next();
});

// In development mode, add a link to Redis test page in navigation
if (process.env.NODE_ENV === 'development') {
  console.log('Redis test page available at: /dev/redis-test');
}

export default router;
