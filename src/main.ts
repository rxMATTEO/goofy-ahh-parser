import {createApp} from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import 'primevue/resources/themes/md-dark-deeppurple/theme.css';
import "primeflex/primeflex.css";
import 'primeicons/primeicons.css';
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Divider from "primevue/divider";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Chart from "primevue/chart";
import Timeline from "primevue/timeline";
import Card from "primevue/card";
import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";

const app = createApp(App);
app.use(PrimeVue, {ripple: true});
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('InputText', InputText);
app.component('Button', Button);
app.component('Divider', Divider);
app.component('Tabview', TabView);
app.component('Tabpanel', TabPanel);
app.component('Chart', Chart);
app.component('Timeline', Timeline);
app.component('Card', Card);
app.component('Accordion', Accordion);
app.component('AccordionTab', AccordionTab);
app.mount('#app');
