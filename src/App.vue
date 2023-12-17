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

onMounted(async () => {
  body.value = (await axios.get('http://localhost:3000/')).data;
  info.value = (await axios.get('http://localhost:3000/info')).data;
  people.value = (await axios.get('http://localhost:3000/people')).data;
});

const columns = computed(() => {
  return {
    firstName: 'Имя',
    lastName: 'Фамилия',
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
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  lastName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  middleName: { value: null, matchMode: FilterMatchMode.IN },
  page: { value: null, matchMode: FilterMatchMode.EQUALS },
  pageNumber: { value: null, matchMode: FilterMatchMode.IN },
  room: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  info: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  rows: { value: null, matchMode: FilterMatchMode.STARTS_WITH },

});
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

  <DataTable v-model:filters="filters" :value="people" paginator :rows="10" removableSort
             :rowsPerPageOptions="rowsPerPage" :loading="!people" showGridlines
             :filterDisplay="'row'" :globalFilterFields="['firstName', 'lastName', 'middleName']"
  >
    <template #header>
      <div class="flex justify-content-end">
            <span class="p-input-icon-left">
                <i class="pi pi-search" />
                <InputText v-model="filters['global'].value" placeholder="Поиск" />
            </span>
      </div>
    </template>
    <Column v-for="[k,v] in Object.entries(columns)" :header="v" :field="k" sortable :key="k" :style="{width: `${1 / Object.keys(columns).length * 100}%`}">
      <template #body="{data}">
        {{ data[k] }}
      </template>
      <template #filter="{filterModel, filterCallback}">
        <InputText v-model="filterModel.value" type="text" @input="filterCallback()" class="p-column-filter" :placeholder="`Искать по ${v}`" />
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
</style>
