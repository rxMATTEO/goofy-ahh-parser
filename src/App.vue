<script setup lang="ts">
import axios from "axios";
import {computed, onMounted, Ref, ref} from "vue";

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
    page: 'Страница',
    pageNumber: 'Номер страницы',
    room: 'Комната',
    rows: 'Строки',
    info: 'Информация (входы-выходы)',
  };
});

const rowsPerPage = computed(() => {
  return [10, 20, 50];
});
</script>

<template>
  <div class="p-10">
    <div v-if="info" class="flex place-content-between">
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

    <template v-if="people">
      <DataTable :value="people" paginator :rows="10" :rowsPerPage="[10, 20, 50]">
        <Column v-for="[k,v] in Object.entries(columns)" :header="v" :field="k" />
      </DataTable>
    </template>
  </div>
</template>

<style scoped>
</style>
