<script setup lang="ts">
import axios from "axios";
import {computed, onMounted, Ref, ref} from "vue";
import {FilterMatchMode} from "primevue/api";

type PersonInfo = {
  event: string[]
}

type Person = {
  firstName: string
  lastName: string
  middleName: string
  page: string
  pageNumber: string
  room: string
  rows: string[]
  info: PersonInfo[]
}

const body = ref(null);
const info = ref(null);
const people: Ref<Person[] | null> = ref(null);

const api = 'http://localhost:3001';

onMounted(async () => {
  body.value = (await axios.get(api)).data;
  info.value = (await axios.get(`${api}/info`)).data;
  people.value = (((await axios.get(`${api}/people`)).data) as Person[]).map(
      (person: Person) => {
        return {
          ...person,
          info: person.info.map(
              ([date, keyLabel, time, exit, type, pass, k]) => {
                return {
                  date,
                  keyLabel,
                  time,
                  exit,
                  type,
                  pass: pass || k ? `${pass} ${k}` : undefined
                }
              }
          ).map(obj => {
                Object.keys(obj).forEach(key => {
                  if (obj[key] === undefined) {
                    delete obj[key];
                  }
                });
                return obj;
              }
          )
        }
      }
  );
});

const columns = computed(() => {
  return {
    lastName: 'Фамилия',
    firstName: 'Имя',
    middleName: 'Отчество',
    // page: 'Страница',
    pageNumber: 'Номер страницы',
    room: 'Комната',
    // rows: 'Строки',
    info: 'Информация (входы-выходы)',
  };
});

const rowsPerPage = computed(() => {
  return [10, 20, 50];
});

const filters = ref({
  global: {value: null, matchMode: FilterMatchMode.CONTAINS},
  firstName: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
  lastName: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
  middleName: {value: null, matchMode: FilterMatchMode.IN},
  page: {value: null, matchMode: FilterMatchMode.EQUALS},
  pageNumber: {value: null, matchMode: FilterMatchMode.EQUALS},
  room: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
  info: {value: null, matchMode: FilterMatchMode.IN},
  rows: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
});

const expandedPeople = ref(null);

const expandAll = () => {
  expandedPeople.value = people.value?.filter((p) => p.firstName);
};
const collapseAll = () => {
  expandedPeople.value = null;
};

const eventTypeMatch = (k: string) => ({
  date: "Дата",
  keyLabel: "Ключ",
  time: "Время прохода",
  exit: "Проходная",
  type: "Тип",
  pass: 'Ключ'
}[k])
</script>

<template>
  <div class="p-2">
    <div v-if="info" class="flex justify-content-between">
      <div>
        Тип событий: {{ info.eventsType }}
      </div>
      <div>
        {{ info.creationDate }}
      </div>
      <div>
        Дата: {{ info.dates }}
      </div>
      <div>
        Время: {{ info.time }}
      </div>
    </div>
  </div>

  <DataTable v-model:filters="filters" v-model:expandedRows="expandedPeople"
             :value="people" paginator :rows="10" removableSort
             :rowsPerPageOptions="rowsPerPage" :loading="!people" showGridlines
             :filterDisplay="'row'" :globalFilterFields="['firstName', 'lastName', 'middleName']"
  >
    <template #header>
      <div class="flex justify-content-end">
            <span class="p-input-icon-left">
                <i class="pi pi-search"/>
                <InputText v-model="filters['global'].value" placeholder="Поиск"/>
            </span>
        <Button text icon="pi pi-plus" label="Раскрыть все" @click="expandAll"/>
        <Button text icon="pi pi-minus" label="Свернуть все" @click="collapseAll"/>
      </div>
    </template>
    <Column expander style="width: 5rem"/>
    <Column v-for="[k,v] in Object.entries(columns)" :header="v" :field="k" sortable :key="k"
            :style="{width: `${1 / Object.keys(columns).length * 100}%`}">
      <template #body="{data: {info: [event]}}" v-if="k === 'info'">
        <p>{{ event?.date || "" }} {{ event?.keyLabel || "" }} {{ event?.time || "" }} {{ event?.exit || "" }}
          {{ event?.type || "" }} {{ event?.pass || "" }} ...</p><!--empty cuz expander-->
      </template>
      <template #filter="{filterModel, filterCallback}">
        <InputText v-model="filterModel.value" type="text" @input="filterCallback()" class="p-column-filter"
                   :placeholder="`Искать по ${v}`"/>
      </template>
    </Column>

    <template #expansion="{ data: {info} }">
      <div v-for="infoItem in info">
        <p v-for="[k,v] in Object.entries(infoItem)">
          <span class="text-primary-500 font-bold">{{ eventTypeMatch(k) }}: </span>
          <span v-if="k === 'keyLabel' || k === 'pass'">{{ `${infoItem.keyLabel} ${infoItem.pass}` }}</span>
          <span v-else>{{ v }}</span>
        </p>
        <Divider/>
      </div>
    </template>
  </DataTable>
</template>

<style scoped>
</style>
