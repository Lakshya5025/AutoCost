import React, { useState } from "react";
import { Combobox as HeadlessCombobox } from "@headlessui/react";

interface ComboboxItem {
  id: string;
  name: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  selectedValue: ComboboxItem | null;
  onChange: (value: ComboboxItem | null) => void;
  onCreateNew: (name: string) => void;
}

const Combobox: React.FC<ComboboxProps> = ({
  items,
  selectedValue,
  onChange,
  onCreateNew,
}) => {
  const [query, setQuery] = useState("");

  const filteredItems =
    query === ""
      ? items
      : items.filter((item) =>
          item.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        );

  const showCreateOption =
    query !== "" &&
    !filteredItems.some(
      (item) => item.name.toLowerCase() === query.toLowerCase()
    );

  return (
    <HeadlessCombobox value={selectedValue} onChange={onChange}>
      <div className="relative">
        <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white text-left shadow-sm border border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500 sm:text-sm">
          <HeadlessCombobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(item: ComboboxItem) => item?.name}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Select or type material..."
          />
          <HeadlessCombobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </HeadlessCombobox.Button>
        </div>
        <HeadlessCombobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
          {filteredItems.length === 0 && !showCreateOption ? (
            <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
              Nothing found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <HeadlessCombobox.Option
                key={item.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-indigo-600 text-white" : "text-gray-900"
                  }`
                }
                value={item}>
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}>
                      {item.name}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? "text-white" : "text-indigo-600"
                        }`}>
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </HeadlessCombobox.Option>
            ))
          )}
          {showCreateOption && (
            <HeadlessCombobox.Option
              value={{ id: "create_new", name: query }}
              className={({ active }) =>
                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                  active ? "bg-indigo-600 text-white" : "text-gray-900"
                }`
              }
              onClick={() => onCreateNew(query)}>
              + Create "{query}"
            </HeadlessCombobox.Option>
          )}
        </HeadlessCombobox.Options>
      </div>
    </HeadlessCombobox>
  );
};

// SVG Icons to avoid another dependency
const CheckIcon: React.FC<{ className: string }> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronUpDownIcon: React.FC<{ className: string }> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 20 20"
    strokeWidth={1.5}
    stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
    />
  </svg>
);

export default Combobox;
