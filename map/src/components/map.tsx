import isEqual from 'lodash/isEqual';
import React from 'react';
import {
  MdExpandLess,
  MdExpandMore,
  MdMyLocation,
  MdRefresh,
} from 'react-icons/md';
import { Filter, MARKER_TYPES } from 'src/data';
import { button, iconButton } from 'src/styling/mixins';

import { getMarkerData, MarkerInfo } from '../data/markers';
import styled from '../styling';
import {
  createGoogleMap,
  generateSortBasedOnMapCenter,
  haversineDistance,
} from './map-utils/google-maps';
import infoWindowContent from './map-utils/info-window';
import { debouncedUpdateQueryStringMapLocation } from './map-utils/query-string';

interface MapInfo {
  map: google.maps.Map;
  markers: Map<MarkerInfo, google.maps.Marker>;
  markerClusterer: MarkerClusterer;
  /**
   * The filter that is currently being used to display the markers on the map
   */
  currentFilter: Filter;
  clustering?:
    | {
        state: 'idle';
        /** The circles we rendered for the current visible markers */
        serviceCircles: google.maps.Circle[];
        /** Map from original marker to position of cluster if in a cluster */
        clusterMarkers: Map<google.maps.Marker, google.maps.LatLng>;
      }
    | {
        /** A clustering is in progress */
        state: 'active';
      };
}

const getInfo = (marker: google.maps.Marker): MarkerInfo => marker.get('info');

const updateMarkersVisibilityUsingFilter = (
  markers: Map<MarkerInfo, google.maps.Marker>,
  filter: Filter,
) => {
  for (const marker of markers.values()) {
    const info = getInfo(marker);
    const visible = !filter.type || info.type.type === filter.type;
    marker.setVisible(visible);
  }
};

interface Props {
  className?: string;
  filter: Filter;
  searchInput: HTMLInputElement | null;
  results: MarkerInfo[] | null;
  setResults: (results: MarkerInfo[]) => void;
  nextResults?: NextResults;
  setNextResults: (nextResults: NextResults) => void;
  selectedResult: MarkerInfo | null;
  setSelectedResult: (selectedResult: MarkerInfo | null) => void;
  /**
   * Call this
   */
  setUpdateResultsCallback: (callback: (() => void) | null) => void;
  resultsMode: 'open' | 'closed';
  toggleResults: () => void;
  updateResultsOnNextClustering: boolean;
  setUpdateResultsOnNextClustering: (
    updateResultsOnNextClustering: boolean,
  ) => void;
}

interface State {
  markers: MarkerInfo[] | null;
  mapRef: HTMLDivElement | null;
}
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
/**
 * List of results to display next for the current map bounds
 */
export interface NextResults {
  markers: google.maps.Marker[];
  results: MarkerInfo[];
}

class MapComponent extends React.Component<Props, State> {
  private map: MapInfo | null = null;

  private searchBox: {
    searchInput: HTMLInputElement;
    box: google.maps.places.SearchBox;
  } | null = null;

  private infoWindow: google.maps.InfoWindow | null = null;

  public constructor(props: Props) {
    super(props);
    this.state = {
      markers: null,
      mapRef: null,
    };
  }

  public componentDidMount() {
    const { setUpdateResultsCallback } = this.props;
    this.initializeSearch();
    setUpdateResultsCallback(this.updateResults);
    getMarkerData().then(markers => this.setState({ markers }));
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    const { filter, results, nextResults, selectedResult } = this.props;
    const { markers, mapRef } = this.state;
    // Update filter if changed
    if (this.map && !isEqual(filter, this.map.currentFilter)) {
      updateMarkersVisibilityUsingFilter(this.map.markers, filter);
      this.map.markerClusterer.repaint();
      this.map.currentFilter = filter;
    }
    // Update search box if changed
    this.initializeSearch();
    if (nextResults && !results) {
      // If we have next results queued up, but no results yet, set the results
      this.updateResults();
    }
    // Update selected point if changed
    if (selectedResult !== prevProps.selectedResult) {
      this.updateInfoWindow();
    }
    // Initilize map if neccesary
    if (
      (markers !== prevState.markers || mapRef !== prevState.mapRef) &&
      markers &&
      mapRef
    ) {
      this.initializeMap(mapRef, markers);
    }
  }

  public componentWillUnmount() {
    const { setUpdateResultsCallback } = this.props;
    setUpdateResultsCallback(null);
  }

  private updateGoogleMapRef = (mapRef: HTMLDivElement | null) => {
    this.setState({ mapRef });
  };

  private initializeMap = (ref: HTMLDivElement, markersInfo: MarkerInfo[]) => {
    const { filter, setSelectedResult } = this.props;
    const map = createGoogleMap(markersInfo, ref);
    const markers = new Map<MarkerInfo, google.maps.Marker>();
    for (const m of markersInfo) {
      const marker = new window.google.maps.Marker({
        position: m.loc,
        title: m.contentTitle,
      });
      marker.set('info', m);
      markers.set(m, marker);
    }

    // Add a marker clusterer to manage the markers.
    const markerClusterer = new MarkerClusterer(
      map,
      Array.from(markers.values()),
      {
        imagePath:
          'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        ignoreHidden: true,
        zoomOnClick: false,
        averageCenter: true,
        gridSize: 30,
      },
    );

    const m: MapInfo = {
      map,
      markers,
      currentFilter: filter,
      markerClusterer,
    };
    this.map = m;

    updateMarkersVisibilityUsingFilter(markers, filter);

    map.addListener('bounds_changed', () => {
      const bounds = map.getBounds();
      if (this.searchBox && bounds) {
        this.searchBox.box.setBounds(bounds);
      }
      if ('replaceState' in window.history) {
        debouncedUpdateQueryStringMapLocation(map);
      }
    });

    // We iterate over all locations to create markers
    // This pretty much orchestrates everything since the map is the main interaction window
    markers.forEach(marker => {
      const info = getInfo(marker);
      marker.addListener('click', () => {
        setSelectedResult(info);
      });

      return marker;
    });

    const drawMarkerServiceArea = (marker: google.maps.Marker) => {
      if (m.clustering?.state !== 'idle') {
        return;
      }

      const info = getInfo(marker);
      const { color } = MARKER_TYPES[info.type.type];

      const mapBoundingBox = map.getBounds();
      if (mapBoundingBox) {
        const topRight = mapBoundingBox.getNorthEast();
        const bottomLeft = mapBoundingBox.getSouthWest();
        const markerPosition = marker.getPosition();
        const radius = info.loc.serviceRadius;

        // Now compare the distance from the marker to corners of the box;
        if (markerPosition) {
          const distanceToTopRight = haversineDistance(
            markerPosition,
            topRight,
          );
          const distanceToBottomLeft = haversineDistance(
            markerPosition,
            bottomLeft,
          );

          if (distanceToBottomLeft > radius || distanceToTopRight > radius) {
            m.clustering.serviceCircles.push(
              new window.google.maps.Circle({
                strokeColor: color,
                strokeOpacity: 0.3,
                strokeWeight: 1,
                fillColor: color,
                fillOpacity: 0.15,
                map,
                center: marker.getPosition() || undefined,
                radius,
              }),
            );
          } else {
            // TODO: Add to border of map instead of adding a circle
          }
        }
      }
    };

    // Set up event listeners to tell us when the map has started refreshing.
    markerClusterer.addListener('clusteringbegin', () => {
      if (m.clustering?.state === 'idle') {
        m.clustering.serviceCircles.forEach(circle => {
          circle.setMap(null);
        });
      }
      // $("#visible-markers").html('<h2>Loading List View ... </h2>');
    });

    markerClusterer.addListener('click', (cluster: MarkerClusterer) => {
      // Immidiately change the result list to the cluster instead
      // Don't update nextResults as we want that to still be for the current
      // viewport
      this.updateResultsTo({
        markers: cluster.getMarkers(),
        results: cluster.getMarkers().map(marker => getInfo(marker)),
      });
    });

    // The clusters have been computed so we can
    markerClusterer.addListener(
      'clusteringend',
      (newClusterParent: MarkerClusterer) => {
        m.clustering = {
          state: 'idle',
          serviceCircles: [],
          clusterMarkers: new Map(),
        };

        const visibleMarkers: google.maps.Marker[] = [];
        for (const cluster of newClusterParent.getClusters()) {
          let maxMarker: {
            marker: google.maps.Marker;
            serviceRadius: number;
          } | null = null;
          const center = cluster.getCenter();
          const clusterMarkers = cluster.getMarkers();
          // Figure out which marker in each cluster will generate a circle.
          for (const marker of clusterMarkers) {
            // Update maxMarker to higher value if found.
            const info = getInfo(marker);
            if (
              !maxMarker ||
              maxMarker.serviceRadius < info.loc.serviceRadius
            ) {
              maxMarker = {
                marker,
                serviceRadius: info.loc.serviceRadius,
              };
            }
            visibleMarkers.push(marker);
            if (clusterMarkers.length > 1) {
              m.clustering.clusterMarkers.set(marker, center);
            }
          }

          // Draw a circle for the marker with the largest radius for each cluster (even clusters with 1 marker)
          if (maxMarker) {
            drawMarkerServiceArea(maxMarker.marker);
          }
        }

        // Sort markers based on distance from center of screen
        const mapCenter = map.getCenter();
        visibleMarkers.sort(generateSortBasedOnMapCenter(mapCenter));

        // Store the next results in the state
        const nextResults = {
          markers: visibleMarkers,
          results: visibleMarkers.map(marker => getInfo(marker)),
        };

        const {
          setNextResults: updateNextResults,
          updateResultsOnNextClustering,
          setUpdateResultsOnNextClustering,
        } = this.props;

        updateNextResults(nextResults);

        if (updateResultsOnNextClustering) {
          setUpdateResultsOnNextClustering(false);
          this.updateResults();
        }
        // Update tooltip position if neccesary
        // (marker may be newly in or out of cluster)
        this.updateInfoWindow();
      },
    );
  };

  private updateResults = () => {
    const { results, nextResults } = this.props;
    if (this.map && nextResults && results !== nextResults.results) {
      this.updateResultsTo(nextResults);
    }
  };

  private updateResultsTo = (results: NextResults) => {
    const { setResults } = this.props;
    if (this.map) {
      // Clear all existing marker labels
      for (const marker of this.map.markers.values()) {
        marker.setLabel('');
      }
      // Relabel marker labels based on their index
      results.markers.forEach((marker, index) => {
        marker.setLabel((index + 1).toString());
      });
      // Update the new results state
      setResults(results.results);
    }
  };

  /**
   * Open the tooltip for the currently selected marker, or close it if none is
   * selected. And return the coordinates that were used to place the tooltip.
   */
  private updateInfoWindow = (): google.maps.LatLng | undefined => {
    const { selectedResult, setSelectedResult } = this.props;
    if (!this.map) {
      return;
    }
    const marker = selectedResult && this.map.markers.get(selectedResult);
    if (selectedResult && marker) {
      const clusterCenter =
        this.map.clustering?.state === 'idle' &&
        this.map.clustering.clusterMarkers.get(marker);
      const contentString = infoWindowContent(selectedResult);
      if (!this.infoWindow) {
        this.infoWindow = new window.google.maps.InfoWindow({
          content: contentString,
        });
        this.infoWindow.addListener('closeclick', () =>
          setSelectedResult(null),
        );
      }
      this.infoWindow.setContent(contentString);
      if (clusterCenter) {
        this.infoWindow.open(this.map.map);
        this.infoWindow.setPosition(clusterCenter);
        return clusterCenter;
      }
      this.infoWindow.open(this.map.map, marker);
      return marker.getPosition() || undefined;
    }
    if (this.infoWindow) {
      this.infoWindow.close();
    }
  };

  private centerToGeolocation = () => {
    navigator.geolocation.getCurrentPosition(
      position => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (!this.map) {
          return;
        }
        this.map.map.setCenter(pos);
        this.map.map.setZoom(8);
        const { setUpdateResultsOnNextClustering } = this.props;
        setUpdateResultsOnNextClustering(true);
      },
      error => {
        alert('Unable to get geolocation!');
        // eslint-disable-next-line no-console
        console.error(error.message);
      },
    );
  };

  private initializeSearch() {
    const { searchInput } = this.props;
    if (this.searchBox?.searchInput !== searchInput) {
      if (!searchInput) {
        this.searchBox = null;
        return;
      }
      const box = new google.maps.places.SearchBox(searchInput);
      this.searchBox = {
        searchInput,
        box,
      };

      this.searchBox.box.addListener('places_changed', () => {
        if (!this.map) {
          return;
        }

        const places = box.getPlaces();
        const bounds = new window.google.maps.LatLngBounds();

        if (places.length === 0) {
          return;
        }

        places.forEach(place => {
          if (!place.geometry) {
            return;
          }

          if (place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry.location);
          }
        });

        this.map.map.fitBounds(bounds);
      });
    }
  }

  public render() {
    const {
      className,
      results,
      nextResults,
      resultsMode,
      toggleResults,
    } = this.props;
    const hasNewResults = nextResults && nextResults.results !== results;
    const ExpandIcon = resultsMode === 'open' ? MdExpandMore : MdExpandLess;
    return (
      <div className={className}>
        <div className="map" ref={this.updateGoogleMapRef} />
        <div className="map-actions">
          {hasNewResults && (
            <button type="button" onClick={this.updateResults}>
              <MdRefresh className="icon icon-left" />
              Update results for this area
            </button>
          )}
          {navigator.geolocation && (
            <button type="button" onClick={this.centerToGeolocation}>
              <MdMyLocation className="icon icon-left" />
              My Location
            </button>
          )}
        </div>
        <div className="results-tab" onClick={toggleResults}>
          <div>
            <ExpandIcon />
            <span>
              {resultsMode === 'open'
                ? 'close'
                : `${results?.length || 0} result(s)`}
            </span>
            <ExpandIcon />
          </div>
        </div>
      </div>
    );
  }
}

const TAB_WIDTH_PX = 30;

export default styled(MapComponent)`
  height: 100%;
  position: relative;

  > .map {
    height: 100%;
  }

  > .map-actions {
    position: absolute;
    bottom: ${p => p.theme.spacingPx}px;
    left: ${p => p.theme.spacingPx}px;
    right: ${p => p.theme.spacingPx}px;
    display: flex;
    justify-content: center;

    > button {
      ${button};
      ${iconButton};
      box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 4px -1px;
      margin: 0 5px;
      background: #fff;
    }
  }

  > .results-tab {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: ${TAB_WIDTH_PX}px;
    pointer-events: none;

    > div {
      z-index: 50;
      position: absolute;
      top: 50%;
      left: 50%;
      height: ${TAB_WIDTH_PX}px;
      line-height: ${TAB_WIDTH_PX}px;
      transform: translate(-50%, -50%) rotate(-90deg);
      pointer-events: all;

      ${button};
      padding: 0 5px;
      box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 4px -1px;
      background: #fff;
      font-size: 1rem;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;

      display: flex;
      align-items: center;

      > span {
        margin: 0 5px;
      }

      > svg {
        width: 20px;
        height: 20px;
      }
    }
  }
`;
