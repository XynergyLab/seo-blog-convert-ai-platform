import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

// PrimeVue components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import Chart from 'primevue/chart'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'
import Tooltip from 'primevue/tooltip'

// Styles
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Create Vue app
const app = createApp(App)

// Register plugins
app.use(router)
app.use(PrimeVue)
app.use(ConfirmationService)
app.use(ToastService)

// Register PrimeVue components
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Button', Button)
app.component('Dialog', Dialog)
app.component('InputText', InputText)
app.component('Calendar', Calendar)
app.component('Dropdown', Dropdown)
app.component('Tag', Tag)
app.component('Chart', Chart)
app.component('ProgressSpinner', ProgressSpinner)
app.component('Message', Message)

// Register directives
app.directive('tooltip', Tooltip)

// Mount the application
app.mount('#app')
