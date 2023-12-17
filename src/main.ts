import {createApp} from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import 'primevue/resources/themes/md-dark-deeppurple/theme.css';
import "primeflex/primeflex.css";
import 'primeicons/primeicons.css';
import InputText from "primevue/inputtext";

const app = createApp(App);
app.use(PrimeVue, {ripple: true});
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('InputText', InputText);
app.mount('#app');
