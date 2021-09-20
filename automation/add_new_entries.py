from io import StringIO
import os
from collections import OrderedDict
import click

import requests
import ruamel.yaml as yaml
from dateutil import parser
from dotenv import load_dotenv
from loguru import logger
from ruamel.yaml.representer import RoundTripRepresenter

load_dotenv("automation/.env")
history_file = "automation/add_new_entries.history"

# Add representer to ruamel.yaml for OrderedDict
class MyRepresenter(RoundTripRepresenter):
    pass


yaml.add_representer(
    OrderedDict, MyRepresenter.represent_dict, representer=MyRepresenter
)
yaml = yaml.YAML()
yaml.Representer = MyRepresenter


def convert_title_to_filename(title, extras=None):
    """Converts the title of the tool to a good file name"""
    if extras is None:
        extras = "-_.()"
    valid_chars = lambda x: x.isalpha() or x.isdigit() or (x in extras)
    title_no_space = "-".join(title.split(" ")).lower()
    keep_valid_chars = lambda x: x if valid_chars(x) else "_"
    new_title = "".join([keep_valid_chars(x) for x in title_no_space])

    return new_title


class BearerAuth(requests.auth.AuthBase):
    def __init__(self, token):
        self.token = token

    def __call__(self, r):
        r.headers["authorization"] = "Bearer " + self.token
        return r


class Tool:
    def __init__(self, typeform_item=None, save_path=None):
        self.fields = {
            "_id": str,
            "author": str,
            "email": str,
            "name": str,
            "founded": str,
            "base": str,
            "category": str,
            "link": str,
            "about": str,
            "date": str,
        }

        if typeform_item:
            self.data = self._parse_typeform(typeform_item)
        else:
            raise Exception("Please specify the source of data")

        if save_path is None:
            raise Exception("Please specify the save path")

        self.save_path = save_path

    def _parse_typeform(self, typeform_item):

        tool = {}
        tf_answers = typeform_item.get("answers")

        tool["_id"] = typeform_item.get("landing_id")

        def parse_choices(choices):
            # ids = choices.get("ids", [])
            labels = choices.get("labels", [])
            labels = [i for i in labels if i != "other"]
            if choices.get("other"):
                other = [choices.get("other")]
            else:
                other = []

            return labels + other

        schema = {
            "hc9X4zgwwHA3": {"key": "author"},
            "D4qJHkdEDhi8": {"key": "title"},
            "hltrDGas0qtV": {"key": "summary"},
            "rsCBWtb9C5BS": {
                "key": "features",
                "transform": lambda x: [
                    i.strip(" ").strip("-").strip(" ") for i in x.split("\n")
                ],
            },
            "We3J0Q83MdaC": {
                "key": "links",
                "field": "url",
                "transform": lambda x: [
                    {
                        "name": x.strip(" ")
                        .lstrip("http://")
                        .lstrip("https://")
                        .strip("/"),
                        "link": x,
                    }
                ] if x else [],
            },
            "LJgBWcwdmHA4": {
                "key": "links",
                "field": "url",
                "transform": lambda x: [
                    {
                        "name": x.strip(" ")
                        .lstrip("http://")
                        .lstrip("https://")
                        .strip("/"),
                        "link": x,
                    }
                ],
            },
            "RHD5OqKiutBd": {
                "key": "categories",
                "field": "choices",
                "transform": parse_choices,
            },
            "hLrxU9bLr8zw": {
                "key": "tags",
                "field": "choices",
                "transform": parse_choices,
            },
            "sGQsEc78hqxk": {
                "key": "platforms",
                "field": "choices",
                "transform": parse_choices,
            },
            "slHuJTJ1n9Mg": {
                "key": "fields",
                "field": "choices",
                "transform": parse_choices,
            },
        }

        # Maintain the order of fields here: We use list not dict
        # because we would like to maintain the order of the fields
        for answer in tf_answers:
            answer_id = answer.get("field", {}).get("id")
            schema_item = schema[answer_id]
            schema_field = schema_item.get("field", "text")
            item_key = schema_item.get("key")
            item_value = answer.get(schema_field)
            if schema_item.get("transform"):
                item_value = schema_item["transform"](item_value)
            tool[item_key] = item_value

        tool["date"] = (
            parser.parse(typeform_item.get("submitted_at")).date().isoformat()
        )

        return tool

    def _save_yaml(self):
        res = None

        target = os.path.join(
            self.save_path, convert_title_to_filename(self.data["title"])
        )

        if os.path.isfile(target):
            logger.debug("Tool already created!")
            res = {"status": "exist"}
        else:
            with open(target, "w+") as fp:
                yaml.dump(OrderedDict(self.data), fp)
            logger.info(f"Added a new tool {self.data.get('_id')}")
            res = {"status": "added", "_id": self.data.get("_id")}

        return res

    def _save_md(self):
        res = None

        md_file = convert_title_to_filename(self.data["title"]) + ".md"
        target = os.path.join(self.save_path, md_file)

        if os.path.isfile(target):
            logger.debug("Tool already created!")
            res = {"status": "exist"}
        else:
            string_stream = StringIO()
            yaml.dump(OrderedDict(self.data), string_stream)
            md_content = string_stream.getvalue()
            string_stream.close()

            with open(target, "w+") as fp:
                fp.write("---\n" + md_content + "\n---")
            logger.info(f"Added a new tool {self.data.get('_id')}")
            res = {
                "status": "added",
                "_id": self.data.get("_id"),
                "title": self.data.get("title"),
            }

        return res

    def save(self, type="md"):

        res = {}
        if type == "yaml":
            res = self._save_yaml()
        elif type == "md":
            res = self._save_md()

        return res


def generate_pages():
    pages_path = "_companies"
    data_companies_path = "_data/companies"
    all_companies = os.listdir(data_companies_path)
    all_companies = [i for i in all_companies if i.endswith("ml")]
    for company in all_companies:
        company_data_file = os.path.join(data_companies_path, company)
        page_file = os.path.join(pages_path, os.path.splitext(company)[0] + ".md")
        # logger.info(f"Reading file {company_data_file}")
        print(f"Reading file {company_data_file}")
        with open(company_data_file, "r") as original:
            data = original.read()
        logger.info(f"Writing file {page_file}")
        with open(page_file, "w") as modified:
            modified.write("---\n" + data + "\n---")


@click.command()
@click.option(
    "--typeform_url",
    default="https://api.typeform.com/forms/Gi9Xfc/responses?page_size=1000",
    help="Typeform URL",
)
@click.option("--token", default=os.getenv("TYPEFORM_TOKEN"), help="Typeform API token")
@click.option("--save_path", default="content/tools/", help="Save path")
def main(typeform_url, token, save_path):

    if not token:
        raise Exception("Please specify the Typeform API token")

    req = requests.get(typeform_url, auth=BearerAuth(token))

    tf_json = req.json()

    logger.info(tf_json.get("total_items"))

    with open(history_file, "r") as fp:
        pr_history = fp.readlines()
    pr_history = [i.strip() for i in pr_history]

    logger.info(f"PR History: {pr_history}")

    for tool in tf_json.get("items"):
        tool_obj = Tool(typeform_item=tool, save_path=save_path)
        if tool_obj.data.get("_id") not in pr_history:
            comp_save = tool_obj.save()
            if comp_save.get("status") == "added":
                with open(history_file, "a") as fp:
                    fp.write(f"{comp_save.get('_id')}\n")
                break

    # logger.info("Generating Pages")
    # generate_pages()


if __name__ == "__main__":

    main()

    logger.info("End of Game")
