/* From Carta Administrativa with all GeoJSON files of parishes,
   generates GeoJSON files of municipalities */

const fs = require('fs')
const path = require('path')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')

const getGeojsonRegions = require(path.join(appRoot.path, 'src', 'server', 'services', 'getGeojsonRegions.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'municipalities')

const { uniteParishes, cloneObj } = require(path.join(__dirname, 'functions'))

let regions

// geojson data for municipalities (aglomerated from parishes geojson data)
// each key is a municipality INE code
const geojsonMunicipalities = {}

getGeojsonRegions((err, _regions) => {
  if (!err) {
    regions = _regions
    generateGeojsonMunicipalities()
    saveFiles()
    console.log(`GeoJSON files generated OK into ${path.relative(appRoot.path, municipalitiesGeojsonDir)}`)
  }
})

function generateGeojsonMunicipalities () {
  let bar = new ProgressBar(
    'Linking parishes to municipalities :percent', { total: Object.keys(regions).length }
  )

  // join parishes that correspond to the same municipality
  for (const key in regions) {
    regions[key].geojson.features.forEach(parish => {
      const codigoine = parish.properties.DICOFRE || parish.properties.Dicofre
      if (codigoine.length !== 6) {
        console.error(parish)
        throw Error('Codigo INE for parish must have 6 digits')
      } else {
        // the municipality code are the first 4 digits out of 6 digits
        const municipalityCode = codigoine.slice(0, 4)

        if (geojsonMunicipalities.hasOwnProperty(municipalityCode)) {  // eslint-disable-line
          geojsonMunicipalities[municipalityCode].freguesias.push(cloneObj(parish))
        } else {
          geojsonMunicipalities[municipalityCode] = {}
          geojsonMunicipalities[municipalityCode].freguesias = [cloneObj(parish)]
        }
      }
    })
    bar.tick()
  }

  bar = new ProgressBar(
    'Merging parishes into municipalities :percent', { total: Object.keys(geojsonMunicipalities).length }
  )

  // now merge parishes geojson for each municipality and compute bbox and centers
  for (const key in geojsonMunicipalities) {
    if (geojsonMunicipalities[key].freguesias.length >= 2) {
      geojsonMunicipalities[key].municipio = uniteParishes(geojsonMunicipalities[key].freguesias)
    } else if (geojsonMunicipalities[key].freguesias.length === 1) {
      geojsonMunicipalities[key].municipio = cloneObj(geojsonMunicipalities[key].freguesias[0])
    } else {
      console.error(geojsonMunicipalities[key])
      throw Error('wrong length')
    }

    geojsonMunicipalities[key].municipio.properties.Dicofre = key

    geojsonMunicipalities[key].municipio.properties.Concelho =
      geojsonMunicipalities[key].freguesias[0].properties.Concelho
    geojsonMunicipalities[key].municipio.properties.Distrito =
      geojsonMunicipalities[key].freguesias[0].properties.Distrito

    bar.tick()
  }
}

function saveFiles () {
  for (const key in geojsonMunicipalities) {
    const file = path.join(municipalitiesGeojsonDir, key + '.json')

    if (!fs.existsSync(path.dirname(file))) {
      fs.mkdirSync(path.dirname(file), { recursive: true })
    }

    fs.writeFileSync(file, JSON.stringify(geojsonMunicipalities[key]))
  }
}
