import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import App from './App.vue';
import router from './router';
import auth0 from './auth.plugin';

// PrimeVue components
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Calendar from 'primevue/calendar';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Chart from 'primevue/chart';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import Tooltip from 'primevue/tooltip';

// Styles
import 'primevue/resources/themes/lara-light-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

async function initializeApplication() {
  try {
    // Create Vue application
    const app = createApp(App);

    // Initialize PrimeVue
    app.use(PrimeVue, { ripple: true });
    app.use(ToastService);
    app.use(ConfirmationService);

    // Register PrimeVue components
    app.component('DataTable', DataTable);
    app.component('Column', Column);
    app.component('Button', Button);
    app.component('Dialog', Dialog);
    app.component('InputText', InputText);
    app.component('Calendar', Calendar);
    app.component('Dropdown', Dropdown);
    app.component('Tag', Tag);
    app.component('Chart', Chart);
    app.component('ProgressSpinner', ProgressSpinner);
    app.component('Message', Message);

    // Register directives
    app.directive('tooltip', Tooltip);

    // Initialize Auth0 before router
    await app.use(auth0);
    
    // Initialize router after Auth0
    app.use(router);

    // Mount the application
    app.mount('#app');
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Handle initialization errors
    const errorContainer = document.createElement('div');
    errorContainer.className = 'initialization-error';
    errorContainer.innerHTML = `
      <h2>Application Initialization Error</h2>
      <p>There was a problem initializing the application. Please try again later.</p>
      <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      <button onclick="window.location.reload()">Retry</button>
    `;
    
    // Apply some basic styles to the error container
    errorContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    // Add button styles
    const retryButton = errorContainer.querySelector('button');
    if (retryButton) {
      retryButton.style.cssText = `
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #4318FF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
    }
    
    // Mount error UI if app container exists
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.appendChild(errorContainer);
    }
  }
}

// Start application initialization
initializeApplication();
