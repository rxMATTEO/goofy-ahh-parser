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
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import {createRouter, createWebHistory} from "vue-router";
import routes from "./routes.ts";
import Toast from "primevue/toast";
import ProgressBar from "primevue/progressbar";
import Badge from "primevue/badge";
import FileUpload from "primevue/fileupload";
import Tooltip from "primevue/tooltip";
import ConfirmPopup from "primevue/confirmpopup";
import Steps from "primevue/steps";
import Textarea from "primevue/textarea";
import ProgressSpinner from "primevue/progressspinner";

const router = createRouter({
  routes,
  history: createWebHistory()
})

const app = createApp(App);
app.use(router);
app.use(ToastService);
app.use(ConfirmationService);
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
app.component('Toast', Toast);
app.component('ProgressBar', ProgressBar);
app.component('Badge', Badge);
app.component('FileUpload', FileUpload);
app.component('ConfirmPopup', ConfirmPopup);
app.component('Steps', Steps);
app.component('Textarea', Textarea);
app.component('ProgressSpinner', ProgressSpinner);
app.directive('tooltip', Tooltip);
app.mount('#app');
